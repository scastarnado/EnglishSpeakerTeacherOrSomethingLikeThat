"""Image generation routes for visual C1 speaking prompts."""

import asyncio
import base64
import hashlib
import json
import struct
import subprocess
import sys
import time
from pathlib import Path
import zlib

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.config import settings
from app.main import verify_auth_token

router = APIRouter()

PART2_IMAGE_JOB = {
    "active": False,
    "stage": "Idle",
    "current_index": None,
    "total": None,
}
PART2_GENERATION_LOCKS: dict[str, asyncio.Lock] = {}

UNSAFE_PROMPT_TERMS = [
    "nude",
    "nudity",
    "naked",
    "nsfw",
    "erotic",
    "sexual",
    "sexy",
    "porn",
    "pornographic",
    "lingerie",
    "underwear",
    "bikini",
    "swimsuit",
    "cleavage",
    "topless",
    "shirtless",
    "bare chest",
    "bare legs",
    "bare shoulders",
    "suggestive",
    "fetish",
    "bedroom",
    "model",
    "glamour",
]


class Part2ImageGenerationRequest(BaseModel):
    sessionId: str
    taskId: str
    taskTitle: str
    instructions: str
    questions: list[str]
    topicTags: list[str]
    imageDescriptions: list[str] = Field(default_factory=list)
    imageModel: str | None = None
    count: int = Field(default=3, ge=1, le=3)


class GeneratedImageAsset(BaseModel):
    id: str
    url: str
    altText: str
    licence: str | None = None
    prompt: str | None = None


class Part2ImageGenerationResponse(BaseModel):
    images: list[GeneratedImageAsset]
    fromCache: bool
    provider: str
    fallbackReason: str | None = None


class Part2ImageGenerationProgress(BaseModel):
    available: bool
    progress: float
    etaSeconds: float | None = None
    currentImageIndex: int | None = None
    totalImages: int | None = None
    stage: str


def _cache_dir() -> Path:
    path = Path(settings.CACHE_PATH) / "part2-images"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _cache_key(request: Part2ImageGenerationRequest) -> str:
    payload = {
        "taskId": request.taskId,
        "title": request.taskTitle,
        "instructions": request.instructions,
        "questions": request.questions,
        "tags": request.topicTags,
        "imageDescriptions": request.imageDescriptions,
        "count": request.count,
        "prompt_version": 13,
        "provider": settings.LOCAL_IMAGE_PROVIDER,
        "api_url": settings.STABLE_DIFFUSION_API_URL,
        "width": settings.LOCAL_IMAGE_WIDTH,
        "height": settings.LOCAL_IMAGE_HEIGHT,
        "steps": settings.LOCAL_IMAGE_STEPS,
        "cfg": settings.LOCAL_IMAGE_CFG_SCALE,
        "sampler": settings.LOCAL_IMAGE_SAMPLER,
        "checkpoint": request.imageModel or settings.LOCAL_IMAGE_CHECKPOINT,
        "safety_version": 6,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def _metadata_path(request: Part2ImageGenerationRequest) -> Path:
    return _cache_dir() / f"{request.sessionId}-{_cache_key(request)}.json"


def _build_prompt(request: Part2ImageGenerationRequest, image_id: str, variation: str) -> str:
    question_focus = _sanitize_prompt_text("; ".join(request.questions))
    tags = ", ".join(request.topicTags)
    safe_variation = _cambridge_safe_scene(request, variation)
    return (
        f"realistic documentary photo of {safe_variation}, "
        "single candid camera shot, one scene, one location, one moment, no layout, "
        "natural daylight, realistic lens perspective, realistic proportions, "
        "clear human activity, clear location, clear objects, ordinary real-world scene, "
        "single camera shot, one scene, one location, one moment in time, full-frame photograph, "
        "strictly family-safe educational image suitable for an 8 year old child, "
        "fully clothed ordinary adults, plain unbranded modest everyday clothing, long trousers or coats, covered shoulders, plain aprons or jackets when useful, "
        "ordinary people, neutral body language, candid everyday scene, "
        "wide shot with people small-to-medium in frame, faces and hands are the only visible skin, "
        "public or educational setting, believable people doing a clear everyday activity, realistic environment, "
        "natural imperfect background, clear subject, sharp details, candid photojournalistic composition. "
        f"Photo {image_id} must be easy to describe because the action, place and objects are obvious. "
        f"Theme: {_sanitize_prompt_text(request.taskTitle)}. Question focus: {question_focus}. Topic tags: {_sanitize_prompt_text(tags)}. "
        "Include enough concrete contextual clues for comparison, speculation and evaluation. "
        "The composition is one continuous unbroken full-frame scene with no visible dividers, no frames and no borders. "
        "Make this one coherent single photograph with one foreground activity and one consistent background. "
        "Avoid staged stock-photo smiles; prefer a natural candid moment with clear actions and objects. "
        "Every visible person must be dressed appropriately for a school textbook."
    )


def _sanitize_prompt_text(value: str) -> str:
    sanitized = value
    for term in UNSAFE_PROMPT_TERMS:
        sanitized = sanitized.replace(term, "modest everyday")
        sanitized = sanitized.replace(term.title(), "Modest everyday")
        sanitized = sanitized.replace(term.upper(), "MODEST EVERYDAY")
    return sanitized


def _cambridge_safe_scene(request: Part2ImageGenerationRequest, variation: str) -> str:
    text = _sanitize_prompt_text(variation).strip().rstrip(".")
    title = _sanitize_prompt_text(request.taskTitle).lower()
    tags = " ".join(request.topicTags).lower()
    combined = f"{title} {tags} {text.lower()}"

    if any(keyword in combined for keyword in ["health", "exercise", "sport", "lifestyle"]):
        setting = "a supervised public park fitness class with fully clothed adults wearing tracksuits and jackets"
    elif any(keyword in combined for keyword in ["travel", "transport", "route", "discovering", "places"]):
        setting = "a public transport hub or city information point with fully clothed travellers using maps and bags"
    elif any(keyword in combined for keyword in ["home", "family", "friends", "cooking", "food"]):
        setting = "a bright family kitchen or community room with fully clothed people preparing food together"
    elif any(keyword in combined for keyword in ["technology", "communication", "software", "online"]):
        setting = "a tidy classroom or office workspace with fully clothed people using laptops and phones"
    elif any(keyword in combined for keyword in ["environment", "trees", "recycling", "park"]):
        setting = "a public community project with fully clothed volunteers sorting recycling or planting trees"
    elif any(keyword in combined for keyword in ["workshop", "tools", "practical", "repair", "craft"]):
        setting = "a supervised community workshop with fully clothed adults using tools safely at workbenches"
    elif any(keyword in combined for keyword in ["art", "culture", "creative", "photography", "music"]):
        setting = "a classroom, museum workshop or public arts centre with fully clothed people doing creative activities"
    elif any(keyword in combined for keyword in ["money", "shopping", "budget", "business"]):
        setting = "a public office, market stall or classroom table with fully clothed people comparing documents or products"
    else:
        setting = "a neutral public classroom, community centre or workplace with fully clothed adults doing a clear everyday activity"

    return (
        f"{setting}; {_specific_activity_detail(text)}"
    )


def _specific_activity_detail(text: str) -> str:
    lower = text.lower()
    if "woodwork" in lower or "woodworking" in lower:
        return "indoor woodworking workshop, adults actively learning woodworking at wooden workbenches, visible wood boards, hand tools, clamps, safety glasses and an instructor demonstrating a technique"
    if "sewing" in lower:
        return "a person is clearly learning sewing, with a sewing machine, fabric pieces, thread and an online lesson visible on a laptop"
    if "map" in lower or "navigation" in lower or "route" in lower:
        return "people are clearly using a paper map or compass together, pointing at a route and discussing where to go"
    if "recycl" in lower:
        return "volunteers are clearly sorting bottles, cardboard and labelled recycling boxes at a community collection point"
    if "tree" in lower or "plant" in lower:
        return "people are clearly planting young trees or plants with gloves, soil, small tools and watering cans"
    if "laptop" in lower or "online" in lower or "software" in lower:
        return "people are clearly using laptops or tablets together, looking at screens and notes in a workplace or classroom"
    if "food" in lower or "cooking" in lower or "kitchen" in lower:
        return "people are clearly preparing food together, with vegetables, bowls, utensils and a kitchen or community cooking table visible"
    if "bike" in lower or "cycling" in lower:
        return "people are clearly travelling by bicycle, with bikes, helmets and a city route or cycle lane visible"
    if "camera" in lower or "photograph" in lower or "filming" in lower:
        return "people are clearly using a camera or phone to record a public activity, with the equipment visible"
    if "presentation" in lower:
        return "people are clearly rehearsing a presentation, standing near a screen with notes and a small audience"
    if "health" in lower or "medical" in lower:
        return "a routine health consultation is clearly happening, with a healthcare worker, desk, documents and simple medical equipment visible"
    if "boxes" in lower or "delivery" in lower:
        return "people are clearly organising boxes, parcels or supplies together, with labels hidden or unreadable"
    if "art" in lower or "painting" in lower or "easel" in lower:
        return "people are clearly painting or making art, with easels, brushes, paper and art materials visible"
    return f"the activity should clearly match this task detail: {text}"


def _variations(request: Part2ImageGenerationRequest) -> list[str]:
    descriptions = [description.strip() for description in request.imageDescriptions if description.strip()]
    if descriptions:
        return descriptions[: request.count]

    base = request.topicTags[0] if request.topicTags else request.taskTitle
    return [
        f"a public shared-space scene that visibly illustrates {request.taskTitle} and connects to {base}",
        f"a smaller home, school or workplace scene that visibly illustrates {request.taskTitle} and connects to {base}",
        f"an outdoor, travel, community or unusual scene that visibly illustrates {request.taskTitle} and connects to {base}",
    ][: request.count]


def _default_webui_script_path() -> Path:
    repo_root = Path(__file__).resolve().parents[4]
    return repo_root / "local-ai" / "stable-diffusion-webui" / "webui-user.bat"


def _webui_script_path() -> Path:
    if settings.LOCAL_IMAGE_WEBUI_PATH:
        return Path(settings.LOCAL_IMAGE_WEBUI_PATH)
    return _default_webui_script_path()


async def _is_local_provider_ready() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{settings.STABLE_DIFFUSION_API_URL.rstrip('/')}/sdapi/v1/sd-models")
            return response.status_code == 200
    except Exception:
        return False


@router.get(
    "/models",
    dependencies=[Depends(verify_auth_token)],
)
async def list_local_image_models():
    """List local image checkpoints exposed by the Stable Diffusion-compatible provider."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{settings.STABLE_DIFFUSION_API_URL.rstrip('/')}/sdapi/v1/sd-models")
            response.raise_for_status()
            data = response.json()
    except Exception:
        models = [settings.LOCAL_IMAGE_CHECKPOINT] if settings.LOCAL_IMAGE_CHECKPOINT else []
        return {"models": models}

    models = []
    for model in data:
        title = model.get("title") or model.get("model_name") or model.get("name")
        if title:
            models.append(str(title))

    if settings.LOCAL_IMAGE_CHECKPOINT and settings.LOCAL_IMAGE_CHECKPOINT not in models:
        models.insert(0, settings.LOCAL_IMAGE_CHECKPOINT)

    return {"models": sorted(set(models), key=models.index)}


async def _ensure_local_provider_ready(timeout_seconds: float | None = None) -> None:
    if await _is_local_provider_ready():
        return

    if not settings.LOCAL_IMAGE_AUTOSTART:
        raise RuntimeError("Local image provider is not running and autostart is disabled")

    script_path = _webui_script_path()
    if not script_path.exists():
        raise RuntimeError(f"Local image provider launcher was not found at {script_path}")

    log_path = script_path.parent / "webui-autostart.log"
    err_path = script_path.parent / "webui-autostart.err.log"
    stdout = log_path.open("ab")
    stderr = err_path.open("ab")

    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    subprocess.Popen(
        [str(script_path)],
        cwd=str(script_path.parent),
        stdout=stdout,
        stderr=stderr,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
    )

    deadline = time.monotonic() + (timeout_seconds if timeout_seconds is not None else 450)
    while time.monotonic() < deadline:
        await asyncio.sleep(min(5, max(0.1, deadline - time.monotonic())))
        if await _is_local_provider_ready():
            return

    raise RuntimeError(
        f"Local image provider did not become ready at {settings.STABLE_DIFFUSION_API_URL} before the image timeout"
    )


async def _refresh_local_checkpoints() -> None:
    if not settings.LOCAL_IMAGE_CHECKPOINT:
        return

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(f"{settings.STABLE_DIFFUSION_API_URL.rstrip('/')}/sdapi/v1/refresh-checkpoints")
    except Exception:
        pass


def _negative_prompt(variation: str = "") -> str:
    lower = variation.lower()
    topic_negatives = ""
    if "woodwork" in lower or "woodworking" in lower:
        topic_negatives = "outdoor path, walking in park, hiking, classroom lecture without tools, children, minors, "
    elif "sewing" in lower:
        topic_negatives = "outdoor path, walking, workshop without fabric, "
    elif "map" in lower or "navigation" in lower or "route" in lower:
        topic_negatives = "indoor lecture, workshop tools, unrelated classroom, "
    elif "recycl" in lower:
        topic_negatives = "walking path, classroom lecture, unrelated meeting, "
    elif "laptop" in lower or "online" in lower or "software" in lower:
        topic_negatives = "outdoor hiking, workshop tools, sports field, "

    return (
        topic_negatives +
        "children, minors, illustration, cartoon, anime, painting, drawing, poster, collage, split screen, grid, "
        "triptych, diptych, contact sheet, photo booth strip, three photos, multiple photos, multiple images, "
        "multiple panels, panel layout, tiled layout, mosaic, storyboard, mood board, picture frame, border, "
        "text, letters, words, captions, subtitles, watermark, logo, brand, UI, interface, "
        "fake writing, text on clothing, printed words on shirts, black border, black footer, footer bar, "
        "timestamp, camera date, metadata strip, signature, "
        "distorted hands, distorted face, extra fingers, missing fingers, malformed hands, malformed eyes, "
        "waxy skin, plastic skin, uncanny face, fake smile, stock photo pose, staged advertising photo, "
        "cgi, 3d render, video game, over-sharpened, oversaturated, blurry, low quality, overprocessed, "
        "nude, nudity, naked, nsfw, erotic, sexual, sexy, porn, pornographic, explicit, adult content, "
        "lingerie, underwear, bikini, swimsuit, swimwear, cleavage, topless, shirtless, bare chest, "
        "bare shoulders, bare legs, exposed stomach, miniskirt, short shorts, tight revealing clothes, "
        "suggestive pose, revealing clothes, see-through clothing, fetish, bedroom, bed, bathroom, beach, pool, "
        "glamour photo, fashion model, solo female model, body-focused portrait, close-up body, pin-up, provocative, sensual"
    )


def _normalize_base64_image(value: str) -> str:
    if "," in value and value.startswith("data:image"):
        return value.split(",", 1)[1]
    return value


def _skin_exposure_ratio(b64_png: str) -> float:
    image_bytes = base64.b64decode(_normalize_base64_image(b64_png))
    width, height, pixels = _read_png_rgb_pixels(image_bytes)
    return _skin_exposure_ratio_from_pixels(pixels)


def _skin_exposure_ratio_from_pixels(pixels: list[tuple[int, int, int]]) -> float:
    if not pixels:
        return 0

    skin_like = 0
    sample_step = max(1, len(pixels) // (192 * 192))
    sampled_pixels = pixels[::sample_step]
    for red, green, blue in sampled_pixels:
        total = max(red + green + blue, 1)
        red_share = red / total
        green_share = green / total
        blue_share = blue / total
        is_skin_like = (
            105 <= red <= 245
            and 55 <= green <= 205
            and 35 <= blue <= 185
            and red > green * 1.04
            and green > blue * 1.08
            and 0.36 <= red_share <= 0.56
            and 0.25 <= green_share <= 0.40
            and 0.15 <= blue_share <= 0.32
        )
        if is_skin_like:
            skin_like += 1

    return skin_like / len(sampled_pixels)


def _panel_divider_score(width: int, height: int, pixels: list[tuple[int, int, int]]) -> float:
    if width < 20 or height < 20 or not pixels:
        return 0

    def luminance(pixel: tuple[int, int, int]) -> int:
        red, green, blue = pixel
        return int((red * 299 + green * 587 + blue * 114) / 1000)

    def pixel_at(x: int, y: int) -> tuple[int, int, int]:
        return pixels[y * width + x]

    divider_hits = _long_bright_divider_count(width, height, pixels)
    sampled_lines = 6

    for x in [width // 3, width // 2, (width * 2) // 3]:
        strong_edges = 0
        total = 0
        for y in range(0, height, max(1, height // 96)):
            left = luminance(pixel_at(max(0, x - 2), y))
            centre = luminance(pixel_at(x, y))
            right = luminance(pixel_at(min(width - 1, x + 2), y))
            if abs(centre - left) > 32 and abs(centre - right) > 32:
                strong_edges += 1
            total += 1
        if total and strong_edges / total > 0.42:
            divider_hits += 1

    for y in [height // 3, height // 2, (height * 2) // 3]:
        strong_edges = 0
        total = 0
        for x in range(0, width, max(1, width // 96)):
            above = luminance(pixel_at(x, max(0, y - 2)))
            centre = luminance(pixel_at(x, y))
            below = luminance(pixel_at(x, min(height - 1, y + 2)))
            if abs(centre - above) > 32 and abs(centre - below) > 32:
                strong_edges += 1
            total += 1
        if total and strong_edges / total > 0.42:
            divider_hits += 1

    return divider_hits / sampled_lines if sampled_lines else 0


def _long_bright_divider_count(width: int, height: int, pixels: list[tuple[int, int, int]]) -> int:
    def is_bright_separator(pixel: tuple[int, int, int]) -> bool:
        red, green, blue = pixel
        return red > 218 and green > 218 and blue > 218 and max(red, green, blue) - min(red, green, blue) < 28

    def pixel_at(x: int, y: int) -> tuple[int, int, int]:
        return pixels[y * width + x]

    divider_count = 0
    for x in range(8, width - 8, max(1, width // 160)):
        hits = 0
        total = 0
        for y in range(0, height, max(1, height // 120)):
            if is_bright_separator(pixel_at(x, y)):
                hits += 1
            total += 1
        if total and hits / total > 0.48:
            divider_count += 1

    for y in range(8, height - 8, max(1, height // 120)):
        hits = 0
        total = 0
        for x in range(0, width, max(1, width // 160)):
            if is_bright_separator(pixel_at(x, y)):
                hits += 1
            total += 1
        if total and hits / total > 0.48:
            divider_count += 1

    return min(divider_count, 6)


def _read_png_rgb_pixels(image_bytes: bytes) -> tuple[int, int, list[tuple[int, int, int]]]:
    if not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("generated image is not a PNG")

    offset = 8
    width = 0
    height = 0
    bit_depth = 0
    color_type = 0
    idat_chunks: list[bytes] = []

    while offset + 8 <= len(image_bytes):
        length = struct.unpack(">I", image_bytes[offset : offset + 4])[0]
        chunk_type = image_bytes[offset + 4 : offset + 8]
        chunk_data = image_bytes[offset + 8 : offset + 8 + length]
        offset += length + 12

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type = struct.unpack(">IIBB", chunk_data[:10])
        elif chunk_type == b"IDAT":
            idat_chunks.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if bit_depth != 8 or color_type not in (2, 6):
        raise ValueError(f"unsupported PNG format: bit depth {bit_depth}, colour type {color_type}")

    channels = 3 if color_type == 2 else 4
    row_stride = width * channels
    raw = zlib.decompress(b"".join(idat_chunks))
    rows: list[bytearray] = []
    read_offset = 0

    for _ in range(height):
        filter_type = raw[read_offset]
        read_offset += 1
        row = bytearray(raw[read_offset : read_offset + row_stride])
        read_offset += row_stride
        previous = rows[-1] if rows else bytearray(row_stride)
        _unfilter_png_row(row, previous, filter_type, channels)
        rows.append(row)

    pixels: list[tuple[int, int, int]] = []
    for row in rows:
        for index in range(0, len(row), channels):
            pixels.append((row[index], row[index + 1], row[index + 2]))

    return width, height, pixels


def _unfilter_png_row(row: bytearray, previous: bytearray, filter_type: int, bytes_per_pixel: int) -> None:
    if filter_type == 0:
        return
    if filter_type == 1:
        for index in range(len(row)):
            left = row[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            row[index] = (row[index] + left) & 0xFF
        return
    if filter_type == 2:
        for index in range(len(row)):
            row[index] = (row[index] + previous[index]) & 0xFF
        return
    if filter_type == 3:
        for index in range(len(row)):
            left = row[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            up = previous[index]
            row[index] = (row[index] + ((left + up) // 2)) & 0xFF
        return
    if filter_type == 4:
        for index in range(len(row)):
            left = row[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            up = previous[index]
            up_left = previous[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            row[index] = (row[index] + _paeth_predictor(left, up, up_left)) & 0xFF
        return

    raise ValueError(f"unsupported PNG filter type: {filter_type}")


def _paeth_predictor(left: int, up: int, up_left: int) -> int:
    estimate = left + up - up_left
    left_distance = abs(estimate - left)
    up_distance = abs(estimate - up)
    up_left_distance = abs(estimate - up_left)
    if left_distance <= up_distance and left_distance <= up_left_distance:
        return left
    if up_distance <= up_left_distance:
        return up
    return up_left


def _passes_child_safe_visual_gate(b64_png: str) -> tuple[bool, str | None]:
    try:
        image_bytes = base64.b64decode(_normalize_base64_image(b64_png))
        width, height, pixels = _read_png_rgb_pixels(image_bytes)
        skin_ratio = _skin_exposure_ratio_from_pixels(pixels)
        divider_score = _panel_divider_score(width, height, pixels)
        footer_score = _dark_footer_score(width, height, pixels)
    except Exception as exc:
        return False, f"could not inspect generated image safety: {exc}"

    if skin_ratio > 0.45:
        return False, f"too much exposed skin-coloured area detected ({skin_ratio:.0%})"

    if divider_score > 0.32:
        return False, f"collage or panel divider layout detected ({divider_score:.0%})"

    if footer_score > 0.55:
        return False, f"black footer or caption bar detected ({footer_score:.0%})"

    return True, None


def _dark_footer_score(width: int, height: int, pixels: list[tuple[int, int, int]]) -> float:
    if width < 20 or height < 20 or not pixels:
        return 0

    footer_start = int(height * 0.92)
    dark_pixels = 0
    total = 0
    for y in range(footer_start, height):
        for x in range(0, width, max(1, width // 160)):
            red, green, blue = pixels[y * width + x]
            if red < 35 and green < 35 and blue < 35:
                dark_pixels += 1
            total += 1

    return dark_pixels / total if total else 0


async def _generate_local_stable_diffusion_image(
    prompt: str,
    timeout_seconds: float,
    variation: str = "",
    image_model: str | None = None,
) -> str:
    api_url = settings.STABLE_DIFFUSION_API_URL.rstrip("/")

    async with httpx.AsyncClient(timeout=max(1, timeout_seconds)) as client:
        payload = {
            "prompt": prompt,
            "negative_prompt": _negative_prompt(variation),
            "steps": settings.LOCAL_IMAGE_STEPS,
            "cfg_scale": settings.LOCAL_IMAGE_CFG_SCALE,
            "width": settings.LOCAL_IMAGE_WIDTH,
            "height": settings.LOCAL_IMAGE_HEIGHT,
            "sampler_name": settings.LOCAL_IMAGE_SAMPLER,
            "batch_size": 1,
            "n_iter": 1,
            "restore_faces": False,
            "tiling": False,
            "seed": -1,
            "subseed": -1,
        }
        selected_checkpoint = image_model or settings.LOCAL_IMAGE_CHECKPOINT
        if selected_checkpoint:
            payload["override_settings"] = {"sd_model_checkpoint": selected_checkpoint}
            payload["override_settings_restore_afterwards"] = False

        try:
            response = await client.post(
                f"{api_url}/sdapi/v1/txt2img",
                json=payload,
            )
        except httpx.TimeoutException as exc:
            raise TimeoutError(f"Stable Diffusion image request exceeded {timeout_seconds:.1f}s") from exc
        response.raise_for_status()
        data = response.json()
        images = data.get("images") or []
        if images:
            return _normalize_base64_image(images[0])

    raise RuntimeError("Local image provider returned no image data")


async def _interrupt_local_generation() -> None:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(f"{settings.STABLE_DIFFUSION_API_URL.rstrip('/')}/sdapi/v1/interrupt")
    except Exception:
        pass


@router.get(
    "/part2/progress",
    response_model=Part2ImageGenerationProgress,
    dependencies=[Depends(verify_auth_token)],
)
async def get_part2_image_generation_progress():
    """Return progress from the local Stable Diffusion provider."""
    current_index = PART2_IMAGE_JOB.get("current_index")
    total_images = PART2_IMAGE_JOB.get("total")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{settings.STABLE_DIFFUSION_API_URL.rstrip('/')}/sdapi/v1/progress")
            response.raise_for_status()
            data = response.json()
    except Exception:
        return Part2ImageGenerationProgress(
            available=False,
            progress=0,
            etaSeconds=None,
            currentImageIndex=current_index,
            totalImages=total_images,
            stage=str(PART2_IMAGE_JOB.get("stage") or "Starting local image model"),
        )

    state = data.get("state") or {}
    job = state.get("job") or state.get("job_no")
    sampling_step = state.get("sampling_step")
    sampling_steps = state.get("sampling_steps")
    stage = "Generating image"
    if sampling_step is not None and sampling_steps:
        stage = f"Sampling step {sampling_step} of {sampling_steps}"
    elif job:
        stage = str(job)

    local_progress = max(0, min(float(data.get("progress") or 0), 1))
    overall_progress = local_progress
    if current_index and total_images:
        overall_progress = ((current_index - 1) + local_progress) / total_images

    eta_seconds = data.get("eta_relative")
    if eta_seconds is not None and current_index and total_images:
        remaining_images = max(total_images - current_index, 0)
        eta_seconds = float(eta_seconds) * (remaining_images + 1)

    return Part2ImageGenerationProgress(
        available=True,
        progress=max(0, min(overall_progress, 1)),
        etaSeconds=eta_seconds,
        currentImageIndex=current_index,
        totalImages=total_images,
        stage=stage,
    )


@router.post(
    "/part2/generate",
    response_model=Part2ImageGenerationResponse,
    dependencies=[Depends(verify_auth_token)],
)
async def generate_part2_images(request: Part2ImageGenerationRequest):
    """Generate realistic Part 2 photo prompts on demand using a local image model."""
    metadata_path = _metadata_path(request)
    if metadata_path.exists():
        return Part2ImageGenerationResponse(
            images=[GeneratedImageAsset(**image) for image in json.loads(metadata_path.read_text(encoding="utf-8"))],
            fromCache=True,
            provider=settings.LOCAL_IMAGE_PROVIDER,
        )

    cache_key = _cache_key(request)
    lock = PART2_GENERATION_LOCKS.setdefault(cache_key, asyncio.Lock())
    try:
        async with lock:
            if metadata_path.exists():
                return Part2ImageGenerationResponse(
                    images=[GeneratedImageAsset(**image) for image in json.loads(metadata_path.read_text(encoding="utf-8"))],
                    fromCache=True,
                    provider=settings.LOCAL_IMAGE_PROVIDER,
                )
            return await _generate_part2_images_uncached(request, metadata_path)
    finally:
        if not lock.locked():
            PART2_GENERATION_LOCKS.pop(cache_key, None)


async def _generate_part2_images_uncached(
    request: Part2ImageGenerationRequest,
    metadata_path: Path,
) -> Part2ImageGenerationResponse:
    images: list[GeneratedImageAsset] = []
    started_at = time.monotonic()
    total_timeout = max(10, settings.LOCAL_IMAGE_TOTAL_TIMEOUT_SECONDS)
    try:
        PART2_IMAGE_JOB.update(
            {
                "active": True,
                "stage": "Starting local image model",
                "current_index": None,
                "total": request.count,
            }
        )
        await _ensure_local_provider_ready(total_timeout - (time.monotonic() - started_at))
        await _refresh_local_checkpoints()
        if time.monotonic() - started_at >= total_timeout:
            raise TimeoutError(f"Local image generation exceeded the {total_timeout}s limit before rendering")

        variations = _variations(request)
        PART2_IMAGE_JOB["total"] = len(variations)
        for index, variation in enumerate(variations):
            elapsed = time.monotonic() - started_at
            remaining_total = total_timeout - elapsed
            remaining_images = len(variations) - index
            if remaining_total <= 1:
                raise TimeoutError(f"Local image generation exceeded the {total_timeout}s limit")

            image_id = chr(ord("A") + index)
            PART2_IMAGE_JOB.update(
                {
                    "stage": f"Generating photo {image_id}",
                    "current_index": index + 1,
                    "total": len(variations),
                }
            )
            prompt = _build_prompt(request, image_id, variation)
            b64_png = None
            rejection_reason = None
            max_attempts = 3
            for attempt in range(max_attempts):
                elapsed = time.monotonic() - started_at
                remaining_total = total_timeout - elapsed
                attempts_left = max_attempts - attempt
                if remaining_total <= 1:
                    raise TimeoutError(f"Local image generation exceeded the {total_timeout}s limit")

                PART2_IMAGE_JOB["stage"] = (
                    f"Generating photo {image_id}"
                    if attempt == 0
                    else f"Regenerating photo {image_id} after safety rejection"
                )
                per_image_timeout = max(1, min(remaining_total, remaining_total / max(remaining_images, 1) + 8))
                candidate_b64 = await _generate_local_stable_diffusion_image(
                    prompt,
                    per_image_timeout,
                    variation,
                    request.imageModel,
                )
                is_safe, rejection_reason = _passes_child_safe_visual_gate(candidate_b64)
                if is_safe:
                    b64_png = candidate_b64
                    break

            if b64_png is None:
                raise RuntimeError(
                    f"Generated photo {image_id} was rejected by the child-safe visual gate: {rejection_reason}"
                )
            images.append(
                GeneratedImageAsset(
                    id=image_id,
                    url=f"data:image/png;base64,{b64_png}",
                    altText=f"Locally generated family-safe realistic Part 2 photo {image_id} for {request.taskTitle}.",
                    licence="Locally AI-generated on-demand practice image",
                    prompt=prompt,
                )
            )

        PART2_IMAGE_JOB.update(
            {
                "active": False,
                "stage": "Images ready",
                "current_index": len(images),
                "total": len(images),
            }
        )
        metadata_path.write_text(
            json.dumps([image.model_dump() for image in images], ensure_ascii=True),
            encoding="utf-8",
        )
        return Part2ImageGenerationResponse(
            images=images,
            fromCache=False,
            provider=settings.LOCAL_IMAGE_PROVIDER,
        )
    except TimeoutError as exc:
        await _interrupt_local_generation()
        return Part2ImageGenerationResponse(
            images=[],
            fromCache=False,
            provider=settings.LOCAL_IMAGE_PROVIDER,
            fallbackReason=f"Local Part 2 image generation stopped after the {total_timeout}s limit. Details: {exc}",
        )
    except Exception as exc:
        return Part2ImageGenerationResponse(
            images=[],
            fromCache=False,
            provider=settings.LOCAL_IMAGE_PROVIDER,
            fallbackReason=(
                "Local Part 2 image generation is unavailable. Start a local Stable Diffusion WebUI/SD.Next "
                f"server with API enabled at {settings.STABLE_DIFFUSION_API_URL}, then try again. Details: {exc}"
            ),
        )
    finally:
        if not images:
            PART2_IMAGE_JOB.update(
                {
                    "active": False,
                    "stage": "Image generation unavailable",
                    "current_index": None,
                    "total": None,
                }
            )
