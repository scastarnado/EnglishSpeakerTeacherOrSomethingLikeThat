"""Ollama client for local LLM inference."""

import httpx
import json
from typing import Dict, List, Optional, Any, AsyncIterator
from pydantic import BaseModel, ValidationError


class OllamaClient:
    """Client for interacting with local Ollama instance."""

    def __init__(self, base_url: str = "http://localhost:11434", timeout: int = 120):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)

    async def generate(
        self,
        prompt: str,
        model: str,
        system: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        stop: Optional[List[str]] = None,
    ) -> str:
        """Generate text completion."""
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }

        if system:
            payload["system"] = system

        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        if stop:
            payload["options"]["stop"] = stop

        try:
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            return result["response"]
        except httpx.HTTPError as e:
            raise Exception(f"Ollama generation failed: {e}")

    async def generate_structured(
        self,
        prompt: str,
        model: str,
        schema: type[BaseModel],
        system: Optional[str] = None,
        max_retries: int = 2,
        temperature: float = 0.7,
    ) -> BaseModel:
        """Generate structured output validated against a Pydantic schema."""
        
        # Add JSON schema instruction to prompt
        json_schema = schema.model_json_schema()
        schema_prompt = f"""{prompt}

You must respond with ONLY valid JSON matching this exact schema:

{json.dumps(json_schema, indent=2)}

Do not include any text outside the JSON object. Begin your response with {{ and end with }}.
"""

        for attempt in range(max_retries + 1):
            try:
                # Generate response
                response_text = await self.generate(
                    prompt=schema_prompt,
                    model=model,
                    system=system,
                    temperature=temperature if attempt == 0 else temperature * 0.8,
                )

                # Try to extract JSON
                json_text = self._extract_json(response_text)

                # Parse and validate
                data = json.loads(json_text)
                validated = schema.model_validate(data)
                return validated

            except (json.JSONDecodeError, ValidationError) as e:
                if attempt < max_retries:
                    print(f"[Ollama] Validation failed (attempt {attempt + 1}), retrying...")
                    # Try again with lower temperature for more deterministic output
                    continue
                else:
                    raise Exception(
                        f"Failed to generate valid structured output after {max_retries + 1} attempts: {e}"
                    )

    async def stream_generate(
        self,
        prompt: str,
        model: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Stream text generation."""
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": temperature,
            },
        }

        if system:
            payload["system"] = system

        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        if "response" in chunk:
                            yield chunk["response"]
        except httpx.HTTPError as e:
            raise Exception(f"Ollama streaming failed: {e}")

    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models."""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            result = response.json()
            return result.get("models", [])
        except httpx.HTTPError as e:
            raise Exception(f"Failed to list Ollama models: {e}")

    async def check_health(self) -> bool:
        """Check if Ollama is available."""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags", timeout=5.0)
            return response.status_code == 200
        except:
            return False

    async def get_version(self) -> Optional[str]:
        """Get Ollama version."""
        try:
            response = await self.client.get(f"{self.base_url}/api/version")
            response.raise_for_status()
            result = response.json()
            return result.get("version")
        except:
            return None

    def _extract_json(self, text: str) -> str:
        """Extract JSON object from text that might contain extra content."""
        # Find first { and last }
        start = text.find("{")
        end = text.rfind("}")

        if start == -1 or end == -1 or end < start:
            # Try with array brackets
            start = text.find("[")
            end = text.rfind("]")

        if start == -1 or end == -1 or end < start:
            raise ValueError("No JSON object or array found in response")

        return text[start : end + 1]

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
