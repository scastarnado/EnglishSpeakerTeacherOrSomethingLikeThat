import learningSkillsNavigation from '../assets/part2-ai/learning-skills-navigation.png';
import learningSkillsOnline from '../assets/part2-ai/learning-skills-online.png';
import learningSkillsWorkshop from '../assets/part2-ai/learning-skills-workshop.png';

export type SpeakingTaskLite = {
  id: string;
  version: number;
  part: number;
  title: string;
  topicTags: string[];
  difficulty: 'C1';
  instructions: string;
  questions: string[];
  followUpQuestions?: string[];
  imageAssets?: Array<{ id: string; url: string; altText: string; licence?: string }>;
  discussionOptions?: Array<{ id: string; text: string; description?: string }>;
  targetFunctions: string[];
  createdBy: 'curated';
  createdAt: string;
  isActive: boolean;
};

export type DiscussionTaskSet = {
  id: string;
  part3: SpeakingTaskLite;
  part4: SpeakingTaskLite;
};

type SceneSpec = {
  title: string;
  alt: string;
  sky: string;
  ground: string;
  accent: string;
  secondary: string;
  setting: 'indoor' | 'outdoor' | 'city' | 'home' | 'workshop' | 'nature';
  people: number;
  props: Array<'laptop' | 'tools' | 'books' | 'bike' | 'plants' | 'camera' | 'food' | 'map' | 'phone' | 'boxes' | 'easel' | 'medical' | 'sport' | 'recycling'>;
};

const CREATED_AT = '2026-07-14T00:00:00.000Z';
const LICENCE = 'Generated local practice asset';
const AI_PHOTO_LICENCE = 'AI-generated local photo-style practice asset';

function svgUrl(scene: SceneSpec): string {
  const people = Array.from({ length: scene.people }, (_, index) => {
    const x = 260 + index * (scene.people > 2 ? 190 : 260);
    const shirt = index % 2 === 0 ? scene.accent : scene.secondary;
    const skin = ['#8a5b43', '#c48662', '#6f4637'][index % 3];
    return `
      <g transform="translate(${x} 0)">
        <circle cx="0" cy="320" r="42" fill="${skin}"/>
        <path d="M-52 430c18-72 86-82 112-12l36 112H-92z" fill="${shirt}"/>
        <path d="M-42 470l-82 48M54 466l88 44" stroke="${skin}" stroke-width="22" stroke-linecap="round"/>
        <path d="M-35 545v110M50 545v110" stroke="#2f3742" stroke-width="24" stroke-linecap="round"/>
      </g>
    `;
  }).join('');

  const props = scene.props.map((prop, index) => renderProp(prop, 160 + index * 145, 585 - (index % 2) * 105, scene)).join('');
  const setting = renderSetting(scene);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">
      <title id="title">${escapeXml(scene.title)}</title>
      <desc id="desc">${escapeXml(scene.alt)}</desc>
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${scene.sky}"/>
          <stop offset="1" stop-color="#f8fafc"/>
        </linearGradient>
        <linearGradient id="ground" x1="0" x2="1">
          <stop offset="0" stop-color="${scene.ground}"/>
          <stop offset="1" stop-color="#74614f"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#sky)"/>
      ${setting}
      <rect y="555" width="1200" height="245" fill="url(#ground)"/>
      <path d="M70 690c195-48 360-34 525 2 178 39 344 34 535-16" stroke="#2f3742" stroke-width="18" opacity=".18" stroke-linecap="round"/>
      ${people}
      ${props}
      <rect x="80" y="70" width="1040" height="660" rx="34" fill="none" stroke="#0f172a" stroke-width="10" opacity=".08"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderSetting(scene: SceneSpec): string {
  if (scene.setting === 'outdoor' || scene.setting === 'nature') {
    return `
      <circle cx="1010" cy="115" r="58" fill="#ffd166"/>
      <path d="M0 425c130-82 260-74 390-35 170 51 305 34 455-35 150-69 262-58 355 8v230H0z" fill="#75a96b" opacity=".7"/>
      <path d="M110 365l92-150 92 150zM250 368l132-218 132 218zM815 365l118-180 118 180z" fill="#59745d"/>
    `;
  }
  if (scene.setting === 'city') {
    return `
      <rect x="80" y="190" width="155" height="355" fill="#8aa0b5"/>
      <rect x="270" y="135" width="180" height="410" fill="#64748b"/>
      <rect x="790" y="175" width="155" height="370" fill="#94a3b8"/>
      <rect x="980" y="115" width="150" height="430" fill="#475569"/>
      <path d="M105 240h105M105 300h105M105 360h105M305 205h105M305 275h105M305 345h105M1010 185h82M1010 255h82M1010 325h82" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>
    `;
  }
  if (scene.setting === 'home') {
    return `
      <rect x="80" y="130" width="260" height="260" rx="18" fill="#f8fafc" stroke="#94a3b8" stroke-width="8"/>
      <path d="M112 330h195M128 175h160M128 220h130M128 265h180" stroke="#64748b" stroke-width="10" stroke-linecap="round"/>
      <rect x="875" y="155" width="170" height="300" rx="16" fill="#a16207" opacity=".65"/>
      <path d="M910 220h100M910 285h100M910 350h100" stroke="#fef3c7" stroke-width="14" stroke-linecap="round"/>
    `;
  }
  return `
    <rect x="70" y="115" width="300" height="230" rx="18" fill="#f8fafc" stroke="#94a3b8" stroke-width="8"/>
    <path d="M110 175h220M110 225h165M110 275h195" stroke="#64748b" stroke-width="12" stroke-linecap="round"/>
    <rect x="830" y="95" width="250" height="390" rx="18" fill="#475569"/>
    <path d="M870 160h170M870 225h170M870 290h170M870 355h170M870 420h170" stroke="#cbd5e1" stroke-width="14" stroke-linecap="round"/>
  `;
}

function renderProp(prop: SceneSpec['props'][number], x: number, y: number, scene: SceneSpec): string {
  const stroke = '#334155';
  const fill = scene.secondary;
  const common = `transform="translate(${x} ${y})"`;
  const shapes: Record<SceneSpec['props'][number], string> = {
    laptop: `<g ${common}><rect x="-55" y="-42" width="120" height="75" rx="8" fill="#1e293b"/><rect x="-42" y="-30" width="94" height="48" rx="4" fill="#93c5fd"/><path d="M-75 45H82" stroke="${stroke}" stroke-width="18" stroke-linecap="round"/></g>`,
    tools: `<g ${common}><rect x="-70" y="-30" width="135" height="70" rx="10" fill="#d97706"/><path d="M-45 5h80M-25-60l80 80M35-58l-74 78" stroke="${stroke}" stroke-width="12" stroke-linecap="round"/></g>`,
    books: `<g ${common}><rect x="-55" y="-55" width="110" height="24" rx="5" fill="${scene.accent}"/><rect x="-68" y="-24" width="132" height="24" rx="5" fill="${fill}"/><rect x="-50" y="8" width="112" height="24" rx="5" fill="#f59e0b"/></g>`,
    bike: `<g ${common}><circle cx="-50" cy="20" r="38" fill="none" stroke="${stroke}" stroke-width="10"/><circle cx="62" cy="20" r="38" fill="none" stroke="${stroke}" stroke-width="10"/><path d="M-50 20l48-70 64 70h-112l112-70" fill="none" stroke="${scene.accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    plants: `<g ${common}><rect x="-36" y="10" width="75" height="58" rx="8" fill="#92400e"/><path d="M0 15c-45-45-42-98 0-124 40 28 45 78 0 124zM0 15c48-45 44-95 0-124" fill="${scene.accent}" opacity=".9"/></g>`,
    camera: `<g ${common}><rect x="-62" y="-40" width="130" height="82" rx="16" fill="${stroke}"/><circle cx="8" cy="2" r="30" fill="#94a3b8"/><circle cx="8" cy="2" r="16" fill="#0f172a"/><rect x="-38" y="-60" width="48" height="22" rx="8" fill="${stroke}"/></g>`,
    food: `<g ${common}><circle cx="0" cy="0" r="55" fill="#f8fafc" stroke="${stroke}" stroke-width="8"/><circle cx="-18" cy="-4" r="18" fill="#ef4444"/><circle cx="20" cy="8" r="20" fill="#22c55e"/><path d="M-70 65h140" stroke="${stroke}" stroke-width="12" stroke-linecap="round"/></g>`,
    map: `<g ${common}><path d="M-68-48l55 20 42-20 58 22v105l-58-22-42 20-55-20z" fill="#fef3c7" stroke="${stroke}" stroke-width="8"/><path d="M-13-28v105M29-48v105M-46 15h98" stroke="#d97706" stroke-width="7" stroke-linecap="round"/></g>`,
    phone: `<g ${common}><rect x="-35" y="-65" width="70" height="130" rx="16" fill="${stroke}"/><rect x="-24" y="-45" width="48" height="86" rx="6" fill="#bfdbfe"/><circle cx="0" cy="52" r="6" fill="#e2e8f0"/></g>`,
    boxes: `<g ${common}><rect x="-68" y="-20" width="70" height="70" fill="#b45309"/><rect x="8" y="-50" width="82" height="82" fill="#d97706"/><path d="M-68 15H2M49-50v82" stroke="#fef3c7" stroke-width="8"/></g>`,
    easel: `<g ${common}><rect x="-42" y="-72" width="90" height="95" rx="4" fill="#f8fafc" stroke="${stroke}" stroke-width="8"/><path d="M3 24l-55 85M3 24l55 85M3 24v85" stroke="${stroke}" stroke-width="10" stroke-linecap="round"/><path d="M-25-25c30-28 52 20 78-8" stroke="${scene.accent}" stroke-width="12" stroke-linecap="round"/></g>`,
    medical: `<g ${common}><rect x="-58" y="-48" width="118" height="96" rx="18" fill="#f8fafc" stroke="${stroke}" stroke-width="8"/><path d="M0-28v56M-28 0h56" stroke="#dc2626" stroke-width="15" stroke-linecap="round"/></g>`,
    sport: `<g ${common}><circle cx="-10" cy="0" r="52" fill="#f8fafc" stroke="${stroke}" stroke-width="8"/><path d="M-55-8c30 18 62 18 92-4M-28-45c18 32 20 66 4 96" stroke="${scene.accent}" stroke-width="9" stroke-linecap="round"/></g>`,
    recycling: `<g ${common}><rect x="-58" y="-45" width="118" height="105" rx="14" fill="#16a34a"/><path d="M-25 8l25-42 25 42M25 8h-50M-8-34l34 58" fill="none" stroke="#dcfce7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  };
  return shapes[prop];
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function images(specs: [SceneSpec, SceneSpec, SceneSpec]) {
  return specs.map((spec, index) => ({
    id: String.fromCharCode(65 + index),
    url: svgUrl(spec),
    altText: spec.alt,
    licence: LICENCE,
  }));
}

function part2Task(
  id: string,
  title: string,
  topicTags: string[],
  prompt: string,
  questions: [string, string],
  followUp: string,
  sceneSpecs: [SceneSpec, SceneSpec, SceneSpec],
): SpeakingTaskLite {
  return {
    id,
    version: 1,
    part: 2,
    title,
    topicTags,
    difficulty: 'C1',
    instructions: `Look at three photographs showing ${prompt}. Talk about two of them. Say ${questions[0]} and ${questions[1]}.`,
    questions,
    followUpQuestions: [followUp],
    imageAssets: images(sceneSpecs),
    targetFunctions: ['comparing', 'speculating', 'evaluating', 'prioritising'],
    createdBy: 'curated',
    createdAt: CREATED_AT,
    isActive: true,
  };
}

export const PART2_TASKS: SpeakingTaskLite[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    version: 2,
    part: 2,
    title: 'People learning practical skills',
    topicTags: ['learning', 'skills', 'education'],
    difficulty: 'C1',
    instructions:
      'Look at three photographs showing people learning practical skills. Talk about two of them. Say why the people might be learning these skills and how useful these skills might be in the future.',
    questions: [
      'why the people might be learning these skills',
      'how useful these skills might be in the future',
    ],
    followUpQuestions: ['Which skill do you think would be more difficult to master?'],
    imageAssets: [
      {
        id: 'A',
        url: learningSkillsWorkshop,
        altText: 'Adults learning woodworking in a workshop with tools and an instructor.',
        licence: AI_PHOTO_LICENCE,
      },
      {
        id: 'B',
        url: learningSkillsNavigation,
        altText: 'A small group learning outdoor navigation with a map and compass.',
        licence: AI_PHOTO_LICENCE,
      },
      {
        id: 'C',
        url: learningSkillsOnline,
        altText: 'A person learning a practical sewing skill through an online lesson.',
        licence: AI_PHOTO_LICENCE,
      },
    ],
    targetFunctions: ['comparing', 'speculating', 'evaluating', 'prioritising'],
    createdBy: 'curated',
    createdAt: CREATED_AT,
    isActive: true,
  },
  part2Task(
    '11111111-1111-4111-8111-111111111112',
    'People solving environmental problems',
    ['environment', 'community', 'responsibility'],
    'people helping to solve environmental problems',
    ['what motivates the people to take action', 'how effective these actions might be'],
    'Which action do you think would have the biggest long-term impact?',
    [
      { title: 'Community recycling point', alt: 'Volunteers sorting recyclable materials at a community collection point.', sky: '#d9f99d', ground: '#4d7c0f', accent: '#16a34a', secondary: '#0284c7', setting: 'outdoor', people: 3, props: ['recycling', 'boxes', 'phone'] },
      { title: 'Tree planting day', alt: 'People planting young trees in a public green space.', sky: '#bbf7d0', ground: '#3f6212', accent: '#15803d', secondary: '#ca8a04', setting: 'nature', people: 3, props: ['plants', 'tools', 'map'] },
      { title: 'Environmental planning meeting', alt: 'People discussing an environmental project around a laptop and documents.', sky: '#e0f2fe', ground: '#78716c', accent: '#0f766e', secondary: '#7c3aed', setting: 'indoor', people: 3, props: ['laptop', 'books', 'recycling'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111113',
    'People preparing for important events',
    ['events', 'planning', 'pressure'],
    'people preparing for important events',
    ['how the people might be feeling', 'what could make the preparation successful'],
    'Which situation do you think would be the most stressful?',
    [
      { title: 'Team presentation rehearsal', alt: 'Colleagues rehearsing a presentation in an office with a screen and notes.', sky: '#e2e8f0', ground: '#57534e', accent: '#2563eb', secondary: '#9333ea', setting: 'indoor', people: 3, props: ['laptop', 'books', 'phone'] },
      { title: 'Catering preparation', alt: 'People preparing food together before a large celebration.', sky: '#ffedd5', ground: '#9a3412', accent: '#ea580c', secondary: '#16a34a', setting: 'home', people: 3, props: ['food', 'boxes', 'phone'] },
      { title: 'Outdoor performance setup', alt: 'People setting up equipment for an outdoor public performance.', sky: '#dbeafe', ground: '#78716c', accent: '#dc2626', secondary: '#0ea5e9', setting: 'city', people: 3, props: ['camera', 'tools', 'boxes'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111114',
    'People using technology to communicate',
    ['technology', 'communication', 'relationships'],
    'people using technology to communicate',
    ['why they might have chosen this way to communicate', 'what the advantages and disadvantages might be'],
    'Which form of communication do you think is most personal?',
    [
      { title: 'Video call at home', alt: 'A person having a video call from a home workspace.', sky: '#ede9fe', ground: '#7c2d12', accent: '#7c3aed', secondary: '#0891b2', setting: 'home', people: 1, props: ['laptop', 'phone', 'books'] },
      { title: 'Team chat in office', alt: 'Colleagues communicating through devices in a busy workplace.', sky: '#dbeafe', ground: '#475569', accent: '#2563eb', secondary: '#f97316', setting: 'indoor', people: 3, props: ['laptop', 'phone', 'books'] },
      { title: 'Street interview recording', alt: 'People recording an interview outdoors with a camera and phone.', sky: '#fef9c3', ground: '#57534e', accent: '#be123c', secondary: '#0f766e', setting: 'city', people: 2, props: ['camera', 'phone', 'map'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111115',
    'People choosing healthy lifestyles',
    ['health', 'wellbeing', 'lifestyle'],
    'people choosing healthy lifestyles',
    ['what might encourage people to do these activities', 'how easy these habits are to maintain'],
    'Which habit do you think is hardest to keep up?',
    [
      { title: 'Group exercise outdoors', alt: 'People exercising together in a park.', sky: '#cffafe', ground: '#166534', accent: '#dc2626', secondary: '#2563eb', setting: 'outdoor', people: 3, props: ['sport', 'phone', 'plants'] },
      { title: 'Healthy cooking at home', alt: 'People preparing healthy food together in a kitchen.', sky: '#fef3c7', ground: '#92400e', accent: '#16a34a', secondary: '#f97316', setting: 'home', people: 2, props: ['food', 'books', 'phone'] },
      { title: 'Health check appointment', alt: 'A person speaking to a healthcare worker during a routine check.', sky: '#e0f2fe', ground: '#64748b', accent: '#0284c7', secondary: '#dc2626', setting: 'indoor', people: 2, props: ['medical', 'laptop', 'books'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111116',
    'People working in different places',
    ['work', 'careers', 'workplace'],
    'people working in different places',
    ['what might be challenging about these working environments', 'which environment might suit different personalities'],
    'Which place would you prefer to work in?',
    [
      { title: 'Open-plan office', alt: 'People collaborating in an open-plan office with laptops and notes.', sky: '#e2e8f0', ground: '#475569', accent: '#2563eb', secondary: '#7c3aed', setting: 'indoor', people: 3, props: ['laptop', 'books', 'phone'] },
      { title: 'Outdoor field work', alt: 'People doing practical work outdoors using a map and tools.', sky: '#bbf7d0', ground: '#3f6212', accent: '#0f766e', secondary: '#ca8a04', setting: 'nature', people: 2, props: ['map', 'tools', 'plants'] },
      { title: 'Home workspace', alt: 'A person working alone at home with a laptop and phone.', sky: '#ffedd5', ground: '#9a3412', accent: '#be123c', secondary: '#0284c7', setting: 'home', people: 1, props: ['laptop', 'phone', 'books'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111117',
    'People travelling in different ways',
    ['travel', 'transport', 'environment'],
    'people travelling in different ways',
    ['why they might have chosen these forms of transport', 'how enjoyable or practical the journeys might be'],
    'Which journey do you think would be the most memorable?',
    [
      { title: 'Cycling through a city', alt: 'People travelling by bike through a city street.', sky: '#dbeafe', ground: '#57534e', accent: '#f97316', secondary: '#2563eb', setting: 'city', people: 2, props: ['bike', 'phone', 'map'] },
      { title: 'Planning a route outdoors', alt: 'Travellers looking at a map before a journey.', sky: '#bbf7d0', ground: '#3f6212', accent: '#16a34a', secondary: '#ca8a04', setting: 'nature', people: 3, props: ['map', 'camera', 'phone'] },
      { title: 'Waiting with luggage', alt: 'People waiting in a transport hub with bags and devices.', sky: '#e2e8f0', ground: '#64748b', accent: '#7c3aed', secondary: '#0891b2', setting: 'city', people: 3, props: ['boxes', 'phone', 'books'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111118',
    'People enjoying culture and the arts',
    ['culture', 'arts', 'leisure'],
    'people enjoying culture and the arts',
    ['what the people might be getting from the experience', 'how important these activities are for society'],
    'Which activity do you think is the most creative?',
    [
      { title: 'Art class', alt: 'People painting together in an art class with easels.', sky: '#fae8ff', ground: '#7c2d12', accent: '#9333ea', secondary: '#f97316', setting: 'indoor', people: 3, props: ['easel', 'books', 'camera'] },
      { title: 'Street photography', alt: 'People taking photographs in a city setting.', sky: '#e0f2fe', ground: '#475569', accent: '#0ea5e9', secondary: '#be123c', setting: 'city', people: 2, props: ['camera', 'phone', 'map'] },
      { title: 'Online music lesson', alt: 'A person following an online creative lesson at home.', sky: '#fef3c7', ground: '#a16207', accent: '#dc2626', secondary: '#2563eb', setting: 'home', people: 1, props: ['laptop', 'books', 'phone'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111119',
    'People helping others',
    ['volunteering', 'community', 'support'],
    'people helping others',
    ['why people might volunteer for these activities', 'what impact their help could have'],
    'Which kind of help do you think is most valuable?',
    [
      { title: 'Food distribution', alt: 'Volunteers sorting food boxes for other people.', sky: '#ffedd5', ground: '#92400e', accent: '#ea580c', secondary: '#16a34a', setting: 'indoor', people: 3, props: ['food', 'boxes', 'phone'] },
      { title: 'Community teaching', alt: 'A person helping others learn using books and a laptop.', sky: '#e0f2fe', ground: '#64748b', accent: '#2563eb', secondary: '#7c3aed', setting: 'indoor', people: 3, props: ['books', 'laptop', 'phone'] },
      { title: 'Park clean-up', alt: 'People helping clean up a public green space.', sky: '#bbf7d0', ground: '#166534', accent: '#16a34a', secondary: '#0284c7', setting: 'outdoor', people: 3, props: ['recycling', 'tools', 'plants'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111120',
    'People making decisions together',
    ['decisions', 'teamwork', 'communication'],
    'people making decisions together',
    ['what they might need to agree on', 'what could make the decision difficult'],
    'Which situation needs the best teamwork?',
    [
      { title: 'Business planning', alt: 'A team discussing a plan with documents and a laptop.', sky: '#e2e8f0', ground: '#57534e', accent: '#2563eb', secondary: '#be123c', setting: 'indoor', people: 3, props: ['laptop', 'books', 'phone'] },
      { title: 'Route choice', alt: 'People deciding which route to take using a map outdoors.', sky: '#bbf7d0', ground: '#3f6212', accent: '#16a34a', secondary: '#f59e0b', setting: 'nature', people: 3, props: ['map', 'phone', 'camera'] },
      { title: 'Home renovation choices', alt: 'People choosing materials and tools for a home project.', sky: '#fef3c7', ground: '#9a3412', accent: '#dc2626', secondary: '#0f766e', setting: 'home', people: 2, props: ['tools', 'books', 'laptop'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111121',
    'People shopping in different ways',
    ['shopping', 'consumer choices', 'technology'],
    'people shopping in different ways',
    ['why these shopping methods might appeal to people', 'what problems each method might involve'],
    'Which way of shopping do you think is best for the environment?',
    [
      { title: 'Local market', alt: 'People buying food at an outdoor local market.', sky: '#fef3c7', ground: '#92400e', accent: '#ea580c', secondary: '#16a34a', setting: 'outdoor', people: 3, props: ['food', 'boxes', 'phone'] },
      { title: 'Online shopping at home', alt: 'A person shopping online at home with parcels nearby.', sky: '#e0f2fe', ground: '#a16207', accent: '#2563eb', secondary: '#be123c', setting: 'home', people: 1, props: ['laptop', 'boxes', 'phone'] },
      { title: 'City shopping trip', alt: 'People shopping in a busy urban area with bags and phones.', sky: '#dbeafe', ground: '#57534e', accent: '#7c3aed', secondary: '#0891b2', setting: 'city', people: 3, props: ['boxes', 'phone', 'camera'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111122',
    'People spending time with family or friends',
    ['relationships', 'leisure', 'family'],
    'people spending time with family or friends',
    ['why these moments might be important', 'how technology might affect experiences like these'],
    'Which situation do you think creates the strongest memories?',
    [
      { title: 'Cooking together', alt: 'People cooking together at home and sharing food.', sky: '#ffedd5', ground: '#9a3412', accent: '#ea580c', secondary: '#16a34a', setting: 'home', people: 3, props: ['food', 'phone', 'books'] },
      { title: 'Outdoor activity', alt: 'Friends spending time outdoors with bikes and a map.', sky: '#bbf7d0', ground: '#166534', accent: '#2563eb', secondary: '#f59e0b', setting: 'outdoor', people: 3, props: ['bike', 'map', 'camera'] },
      { title: 'Remote family call', alt: 'A person using a laptop at home to speak with family or friends.', sky: '#ede9fe', ground: '#7c2d12', accent: '#7c3aed', secondary: '#0ea5e9', setting: 'home', people: 1, props: ['laptop', 'phone', 'books'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111123',
    'People learning from mistakes',
    ['learning', 'resilience', 'self-improvement'],
    'people learning from mistakes',
    ['what may have gone wrong in these situations', 'how the people might improve next time'],
    'Which situation do you think would teach the most useful lesson?',
    [
      { title: 'Repairing a failed project', alt: 'People in a workshop examining a project that needs to be repaired.', sky: '#e2e8f0', ground: '#8d684a', accent: '#dc2626', secondary: '#2563eb', setting: 'workshop', people: 3, props: ['tools', 'books', 'laptop'] },
      { title: 'Reviewing sports performance', alt: 'A group reviewing a sports activity and discussing what to improve.', sky: '#cffafe', ground: '#166534', accent: '#ea580c', secondary: '#0ea5e9', setting: 'outdoor', people: 3, props: ['sport', 'phone', 'books'] },
      { title: 'Studying after feedback', alt: 'A person studying at home after receiving feedback online.', sky: '#fef3c7', ground: '#92400e', accent: '#7c3aed', secondary: '#16a34a', setting: 'home', people: 1, props: ['laptop', 'books', 'phone'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111124',
    'People managing money',
    ['money', 'decisions', 'responsibility'],
    'people managing money',
    ['what financial choices the people might be making', 'why these choices could be difficult'],
    'Which financial decision do you think requires the most maturity?',
    [
      { title: 'Budget planning at home', alt: 'People using a laptop and documents to plan a household budget.', sky: '#e0f2fe', ground: '#7c2d12', accent: '#2563eb', secondary: '#16a34a', setting: 'home', people: 2, props: ['laptop', 'books', 'phone'] },
      { title: 'Choosing what to buy', alt: 'People comparing products and prices in a city shopping area.', sky: '#dbeafe', ground: '#57534e', accent: '#f97316', secondary: '#7c3aed', setting: 'city', people: 3, props: ['boxes', 'phone', 'food'] },
      { title: 'Small business planning', alt: 'People planning a small business with boxes, notes and a computer.', sky: '#e2e8f0', ground: '#64748b', accent: '#0f766e', secondary: '#ca8a04', setting: 'indoor', people: 3, props: ['laptop', 'boxes', 'books'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111125',
    'People dealing with pressure',
    ['stress', 'performance', 'work'],
    'people dealing with pressure',
    ['why these situations might be stressful', 'how well the people might cope with the pressure'],
    'Which situation would put you under the most pressure?',
    [
      { title: 'Last-minute office work', alt: 'People working quickly together in an office with laptops and notes.', sky: '#e2e8f0', ground: '#475569', accent: '#dc2626', secondary: '#2563eb', setting: 'indoor', people: 3, props: ['laptop', 'phone', 'books'] },
      { title: 'Public event preparation', alt: 'People preparing equipment for a public event in a city space.', sky: '#fef9c3', ground: '#57534e', accent: '#be123c', secondary: '#0ea5e9', setting: 'city', people: 3, props: ['camera', 'boxes', 'tools'] },
      { title: 'Exam preparation at home', alt: 'A person studying intensively at home with books and a laptop.', sky: '#ede9fe', ground: '#7c2d12', accent: '#7c3aed', secondary: '#f59e0b', setting: 'home', people: 1, props: ['books', 'laptop', 'phone'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111126',
    'People discovering new places',
    ['travel', 'curiosity', 'places'],
    'people discovering new places',
    ['what might make these places interesting', 'how the people might remember the experience'],
    'Which place would you most like to explore?',
    [
      { title: 'Exploring a city', alt: 'People exploring a city with a map and camera.', sky: '#dbeafe', ground: '#475569', accent: '#0ea5e9', secondary: '#f97316', setting: 'city', people: 3, props: ['map', 'camera', 'phone'] },
      { title: 'Nature walk', alt: 'People discovering a natural area with plants and a map.', sky: '#bbf7d0', ground: '#166534', accent: '#16a34a', secondary: '#ca8a04', setting: 'nature', people: 3, props: ['map', 'plants', 'camera'] },
      { title: 'Virtual tour', alt: 'A person discovering a place through an online virtual tour at home.', sky: '#fef3c7', ground: '#92400e', accent: '#2563eb', secondary: '#be123c', setting: 'home', people: 1, props: ['laptop', 'phone', 'books'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111127',
    'People protecting traditions',
    ['traditions', 'culture', 'generations'],
    'people protecting traditions',
    ['why these traditions might matter to people', 'how traditions can be kept alive'],
    'Which tradition seems most likely to continue in the future?',
    [
      { title: 'Traditional cooking', alt: 'People preparing traditional food together at home.', sky: '#ffedd5', ground: '#9a3412', accent: '#ea580c', secondary: '#16a34a', setting: 'home', people: 3, props: ['food', 'books', 'phone'] },
      { title: 'Craft workshop', alt: 'People learning a traditional craft in a workshop.', sky: '#e2e8f0', ground: '#8d684a', accent: '#0f766e', secondary: '#dc2626', setting: 'workshop', people: 3, props: ['tools', 'easel', 'books'] },
      { title: 'Community celebration', alt: 'People preparing for a community celebration outdoors.', sky: '#fef9c3', ground: '#57534e', accent: '#be123c', secondary: '#2563eb', setting: 'city', people: 3, props: ['camera', 'food', 'phone'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111128',
    'People adapting to change',
    ['change', 'adaptability', 'modern life'],
    'people adapting to change',
    ['what changes the people might be experiencing', 'how easy it might be for them to adapt'],
    'Which kind of change do you think is most difficult?',
    [
      { title: 'Learning new software', alt: 'People learning to use new software in a workplace.', sky: '#e0f2fe', ground: '#475569', accent: '#2563eb', secondary: '#7c3aed', setting: 'indoor', people: 3, props: ['laptop', 'phone', 'books'] },
      { title: 'Moving home', alt: 'People surrounded by boxes while organising a new home.', sky: '#fef3c7', ground: '#92400e', accent: '#f97316', secondary: '#0f766e', setting: 'home', people: 2, props: ['boxes', 'phone', 'books'] },
      { title: 'Changing transport habits', alt: 'People choosing bikes and maps instead of other transport in a city.', sky: '#dbeafe', ground: '#57534e', accent: '#16a34a', secondary: '#0ea5e9', setting: 'city', people: 2, props: ['bike', 'map', 'phone'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111129',
    'People being creative at work',
    ['creativity', 'work', 'innovation'],
    'people being creative at work',
    ['what creative skills the people are using', 'how important creativity might be in these jobs'],
    'Which job do you think needs the most imagination?',
    [
      { title: 'Design meeting', alt: 'People discussing creative ideas around a laptop and sketches.', sky: '#ede9fe', ground: '#64748b', accent: '#7c3aed', secondary: '#f97316', setting: 'indoor', people: 3, props: ['laptop', 'easel', 'books'] },
      { title: 'Creative workshop', alt: 'People making objects together in a hands-on creative workshop.', sky: '#e2e8f0', ground: '#8d684a', accent: '#dc2626', secondary: '#0f766e', setting: 'workshop', people: 3, props: ['tools', 'easel', 'camera'] },
      { title: 'Content creation outdoors', alt: 'People filming or photographing creative content outside.', sky: '#fef9c3', ground: '#57534e', accent: '#be123c', secondary: '#0ea5e9', setting: 'city', people: 2, props: ['camera', 'phone', 'map'] },
    ],
  ),
  part2Task(
    '11111111-1111-4111-8111-111111111130',
    'People solving practical problems',
    ['problem solving', 'teamwork', 'daily life'],
    'people solving practical problems',
    ['what problem the people might be trying to solve', 'which solution might be the most effective'],
    'Which problem would you find most satisfying to solve?',
    [
      { title: 'Fixing equipment', alt: 'People repairing equipment together in a workshop.', sky: '#e2e8f0', ground: '#8d684a', accent: '#2563eb', secondary: '#dc2626', setting: 'workshop', people: 3, props: ['tools', 'laptop', 'books'] },
      { title: 'Organising deliveries', alt: 'People organising boxes and phones for a practical delivery problem.', sky: '#fef3c7', ground: '#9a3412', accent: '#f97316', secondary: '#16a34a', setting: 'indoor', people: 3, props: ['boxes', 'phone', 'laptop'] },
      { title: 'Finding the route', alt: 'People using a map outdoors to solve a route problem.', sky: '#bbf7d0', ground: '#166534', accent: '#0f766e', secondary: '#ca8a04', setting: 'nature', people: 3, props: ['map', 'phone', 'camera'] },
    ],
  ),
];

function part3Task(
  id: string,
  title: string,
  topicTags: string[],
  preparationFocus: string,
  options: string[],
): SpeakingTaskLite {
  return {
    id,
    version: 1,
    part: 3,
    title,
    topicTags,
    difficulty: 'C1',
    instructions: `Talk with your partner about how useful these things are for ${preparationFocus}. Then decide which two are the most important.`,
    questions: [`How useful are these things for ${preparationFocus}?`],
    discussionOptions: options.map((text) => ({
      id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      text,
    })),
    targetFunctions: ['negotiating', 'agreeing', 'disagreeing', 'ranking', 'inviting opinions'],
    createdBy: 'curated',
    createdAt: CREATED_AT,
    isActive: true,
  };
}

function part4Task(
  id: string,
  title: string,
  topicTags: string[],
  questions: string[],
): SpeakingTaskLite {
  return {
    id,
    version: 1,
    part: 4,
    title,
    topicTags,
    difficulty: 'C1',
    instructions: 'Answer broader questions connected to the collaborative task topic.',
    questions,
    targetFunctions: ['evaluating', 'justifying opinions', 'abstract discussion', 'developing arguments'],
    createdBy: 'curated',
    createdAt: CREATED_AT,
    isActive: true,
  };
}

export const DISCUSSION_TASK_SETS: DiscussionTaskSet[] = [
  {
    id: 'careers',
    part3: part3Task(
      '22222222-2222-4222-8222-222222222222',
      'Ways people can prepare for a demanding career',
      ['work', 'careers', 'personal development'],
      'preparing for a demanding career',
      [
        'Getting specialist qualifications',
        'Building professional contacts',
        'Developing resilience',
        'Learning foreign languages',
        'Getting work experience',
      ],
    ),
    part4: part4Task(
      '33333333-3333-4333-8333-333333333333',
      'Work, ambition and personal development',
      ['work', 'society', 'ambition'],
      [
        'Some people say ambition is more important than talent. What do you think?',
        'How has the idea of a successful career changed in recent years?',
        'Do you think schools do enough to prepare young people for working life?',
      ],
    ),
  },
  {
    id: 'communities',
    part3: part3Task(
      '22222222-2222-4222-8222-222222222223',
      'Ways to improve life in a local community',
      ['community', 'cities', 'responsibility'],
      'improving life in a local community',
      [
        'Creating more green spaces',
        'Organising cultural events',
        'Improving public transport',
        'Supporting local businesses',
        'Providing spaces for young people',
      ],
    ),
    part4: part4Task(
      '33333333-3333-4333-8333-333333333334',
      'Community life and social responsibility',
      ['community', 'society', 'citizenship'],
      [
        'How much responsibility should individuals take for improving their local area?',
        'Do you think modern cities make people feel more connected or more isolated?',
        'What role should young people play in community decisions?',
      ],
    ),
  },
  {
    id: 'education',
    part3: part3Task(
      '22222222-2222-4222-8222-222222222224',
      'Ways schools can prepare students for the future',
      ['education', 'future', 'skills'],
      'preparing students for the future',
      [
        'Teaching critical thinking',
        'Encouraging creativity',
        'Offering work placements',
        'Developing digital skills',
        'Teaching emotional intelligence',
      ],
    ),
    part4: part4Task(
      '33333333-3333-4333-8333-333333333335',
      'Education and future skills',
      ['education', 'technology', 'society'],
      [
        'Should education focus more on knowledge or practical skills?',
        'How might artificial intelligence change the role of teachers?',
        'Do you think exams are still a fair way to measure ability?',
      ],
    ),
  },
  {
    id: 'environment',
    part3: part3Task(
      '22222222-2222-4222-8222-222222222225',
      'Ways people can reduce their environmental impact',
      ['environment', 'lifestyle', 'responsibility'],
      'reducing their environmental impact',
      [
        'Buying fewer new products',
        'Using public transport',
        'Eating less meat',
        'Repairing things instead of replacing them',
        'Avoiding unnecessary flights',
      ],
    ),
    part4: part4Task(
      '33333333-3333-4333-8333-333333333336',
      'Environmental choices and responsibility',
      ['environment', 'ethics', 'future'],
      [
        'Do you think environmental problems are mainly caused by individuals or companies?',
        'How can governments persuade people to change their habits?',
        'Is it realistic to expect people to prioritise the environment over convenience?',
      ],
    ),
  },
  {
    id: 'technology',
    part3: part3Task(
      '22222222-2222-4222-8222-222222222226',
      'Ways technology can improve daily life',
      ['technology', 'daily life', 'communication'],
      'improving daily life',
      [
        'Helping people work from home',
        'Making healthcare easier to access',
        'Improving transport',
        'Connecting people socially',
        'Supporting independent learning',
      ],
    ),
    part4: part4Task(
      '33333333-3333-4333-8333-333333333337',
      'Technology and modern life',
      ['technology', 'society', 'communication'],
      [
        'Has technology made people more independent or more dependent?',
        'Do you think online communication can ever replace face-to-face contact?',
        'What kinds of technology should society be more cautious about?',
      ],
    ),
  },
  {
    id: 'health',
    part3: part3Task(
      '22222222-2222-4222-8222-222222222227',
      'Ways people can maintain good mental health',
      ['health', 'wellbeing', 'lifestyle'],
      'maintaining good mental health',
      [
        'Spending time outdoors',
        'Talking to friends',
        'Limiting screen time',
        'Doing regular exercise',
        'Having a predictable routine',
      ],
    ),
    part4: part4Task(
      '33333333-3333-4333-8333-333333333338',
      'Health, wellbeing and modern pressures',
      ['health', 'society', 'stress'],
      [
        'Why do you think many people find it difficult to maintain a healthy lifestyle?',
        'Should employers be responsible for their workers’ mental health?',
        'Has modern life made people more aware of health or more anxious about it?',
      ],
    ),
  },
];

export const PART3_TASK = DISCUSSION_TASK_SETS[0].part3;
export const PART4_TASK = DISCUSSION_TASK_SETS[0].part4;

export function getPart2TaskForSession(sessionId: string): SpeakingTaskLite {
  return PART2_TASKS[getStableIndex(sessionId, PART2_TASKS.length)];
}

export function getDiscussionTaskSetForSession(sessionId: string): DiscussionTaskSet {
  return DISCUSSION_TASK_SETS[getStableIndex(sessionId, DISCUSSION_TASK_SETS.length)];
}

function getStableIndex(value: string, modulo: number): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % modulo;
}
