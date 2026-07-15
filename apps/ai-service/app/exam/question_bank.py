"""C1 Advanced Speaking Part 1 Question Bank - Official Cambridge Format."""

from typing import List, Dict
import random


class Part1QuestionBank:
    """Official C1 Advanced Part 1 question bank organized by topics."""
    
    # Opening questions (mandatory)
    OPENING_QUESTIONS = [
        "Where are you from?",
        "What do you do here?",
        "Tell me, what do you do - are you working or studying?",
        "Can you tell me what you do? Are you working or are you a student?",
    ]
    
    # Follow-up opening questions
    OPENING_FOLLOWUPS = [
        "How long have you been studying English?",
        "What do you enjoy most about learning English?",
        "What are your main reasons for learning English?",
    ]
    
    # Question categories (minimum 3 questions per candidate)
    QUESTION_CATEGORIES = {
        "family_and_friends": {
            "questions": [
                "How important do you think family is?",
                "How much time do you spend with your family and what do you enjoy doing with them?",
                "What qualities does a close friend need to possess?",
                "With whom would you discuss a difficult personal situation, a family member or a close friend?",
                "Do you think it's important to have a large group of friends or just a few close ones?",
            ],
            "followups": [
                "Why do you think that is?",
                "Could you give me an example?",
                "What makes you say that?",
            ]
        },
        
        "wishes": {
            "questions": [
                "Do you ever wish you were rich and famous?",
                "If you could have one wish for the future, what would it be?",
                "If you could change something about your daily life, what would it be?",
                "If you could live anywhere in the world, where would you choose?",
            ],
            "followups": [
                "Why is that?",
                "What would that change for you?",
                "How do you think that would affect your life?",
            ]
        },
        
        "festivals_and_celebrations": {
            "questions": [
                "What is the most important day of the year for you?",
                "How do you usually celebrate a special occasion?",
                "Do you prefer large celebrations or intimate gatherings?",
                "What's your favourite family tradition?",
            ],
            "followups": [
                "Why is that important to you?",
                "How has this changed as you've grown older?",
                "What makes it special?",
            ]
        },
        
        "holidays": {
            "questions": [
                "How important are holidays to you?",
                "If you had the opportunity, what country would you like to visit?",
                "What's your idea of a perfect holiday?",
                "If you could travel round the world, what countries would you visit?",
                "Do you prefer relaxing holidays or active ones?",
            ],
            "followups": [
                "Why does that appeal to you?",
                "What would you most like to see or do there?",
                "How do you usually plan your holidays?",
            ]
        },
        
        "travel": {
            "questions": [
                "Who do you prefer to travel with?",
                "Are you more fond of long or short distance travel?",
                "What has been your most exciting travel experience thus far?",
                "What are some things that you would never leave behind when you travel?",
                "How has travel changed you as a person?",
            ],
            "followups": [
                "Why is that?",
                "What made it so memorable?",
                "What did you learn from that experience?",
            ]
        },
        
        "art": {
            "questions": [
                "What would you say your relationship with the arts is?",
                "Which kind of art are you most interested in?",
                "When was the last time you visited a museum, gallery or exhibition?",
                "Who is your favourite artist?",
                "Do you think art education is important in schools?",
            ],
            "followups": [
                "Why do you find it interesting?",
                "What were your impressions?",
                "What is it about their work that appeals to you?",
            ]
        },
        
        "sports_and_leisure": {
            "questions": [
                "How often do you get around to working out?",
                "What are the pros and cons of doing physical activity?",
                "Have you ever had an amazing sporting experience?",
                "Do you prefer team sports or individual sports?",
                "What do you think about extreme sports?",
            ],
            "followups": [
                "What benefits does it bring you?",
                "What made it amazing?",
                "Why do you prefer that?",
            ]
        },
        
        "success_and_failure": {
            "questions": [
                "What would you consider to be your greatest achievement?",
                "What is success? How would you define it?",
                "Is money an essential part of success nowadays?",
                "Can massive failures ever contribute towards a person's success?",
                "Have you ever failed at something and then succeeded later?",
            ],
            "followups": [
                "Why was that significant for you?",
                "Do you think everyone has the same definition?",
                "Can you give me an example?",
            ]
        },
        
        "communication": {
            "questions": [
                "How has the internet changed the way we communicate?",
                "What negative effects has the internet had on our social lives?",
                "Are you keen on talking on the phone?",
                "When was the last time you sent a personal letter?",
                "Which forms of communication do you think will become obsolete?",
            ],
            "followups": [
                "Why not?",
                "How did that feel?",
                "What makes you think that?",
            ]
        },
        
        "health": {
            "questions": [
                "How important is our diet in living a healthy life?",
                "Would you ever consider having cosmetic surgery?",
                "Do you visit the doctor as often as you should?",
                "Are people aware of the dangers of cigarettes and alcohol?",
                "What's the best way to maintain good mental health?",
            ],
            "followups": [
                "Why or why not?",
                "What prevents you from doing so?",
                "What makes you say that?",
            ]
        },
        
        "celebrities": {
            "questions": [
                "What are some of the advantages and disadvantages of being famous?",
                "Who is your favourite celebrity?",
                "What would you be willing to sacrifice in order to be famous?",
                "Why do you think more young people nowadays long for fame and money?",
            ],
            "followups": [
                "Why do you admire them?",
                "Really? Why?",
                "Do you think this is a positive trend?",
            ]
        },
    }
    
    # Brief acknowledgements for natural flow
    ACKNOWLEDGEMENTS = [
        "Thank you.",
        "Okay.",
        "Right.",
        "I see.",
        "That's interesting.",
        "Thank you for that.",
    ]

    @classmethod
    def get_opening_question(cls) -> str:
        """Get a random opening question."""
        return random.choice(cls.OPENING_QUESTIONS)
    
    @classmethod
    def get_opening_followup(cls) -> str:
        """Get an opening follow-up question."""
        return random.choice(cls.OPENING_FOLLOWUPS)
    
    @classmethod
    def select_questions_for_session(cls, num_questions: int = 6, exclude_topics: List[str] = None) -> List[Dict[str, str]]:
        """
        Select diverse questions for a session.
        
        Args:
            num_questions: Number of questions to select (default 6 for ~3 min)
            exclude_topics: Topics to avoid
        
        Returns:
            List of question dictionaries with 'question', 'topic', 'followup'
        """
        exclude_topics = exclude_topics or []
        available_categories = [
            cat for cat in cls.QUESTION_CATEGORIES.keys()
            if cat not in exclude_topics
        ]
        
        if len(available_categories) < 2:
            available_categories = list(cls.QUESTION_CATEGORIES.keys())
        
        # Select random topics ensuring variety
        selected_topics = random.sample(
            available_categories,
            min(num_questions, len(available_categories))
        )
        
        questions = []
        for topic in selected_topics:
            category = cls.QUESTION_CATEGORIES[topic]
            question = random.choice(category["questions"])
            followup = random.choice(category["followups"])
            
            questions.append({
                "question": question,
                "topic": topic.replace("_", " ").title(),
                "followup": followup,
            })
        
        return questions
    
    @classmethod
    def get_acknowledgement(cls) -> str:
        """Get a brief acknowledgement phrase."""
        return random.choice(cls.ACKNOWLEDGEMENTS)


# C1 Advanced useful phrases for reference
USEFUL_PHRASES = {
    "introducing_personal_information": [
        "I'm currently pursuing a degree in...",
        "As for my background, I've always been interested in...",
        "I come from a family where...",
    ],
    "expressing_preferences": [
        "I'd have to say that I prefer... because...",
        "In my view, the most important aspect is...",
        "I'm particularly fond of... due to...",
    ],
    "giving_reasons_and_examples": [
        "For instance, last year I...",
        "The main reason for this is that...",
        "To illustrate, I've found that...",
    ],
    "describing_experiences": [
        "One memorable experience was when...",
        "Looking back, I realize that...",
        "It was a turning point for me because...",
    ],
}

# Assessment criteria for reference
ASSESSMENT_CRITERIA = {
    "grammar_and_vocabulary": {
        "description": "Range and accuracy of grammatical structures and vocabulary",
        "c1_expectations": [
            "Uses complex grammatical structures with control",
            "Demonstrates wide range of vocabulary with precision",
            "Occasional minor errors don't impede communication",
            "Uses idiomatic language and colloquialisms appropriately",
        ]
    },
    "discourse_management": {
        "description": "Ability to maintain coherent, logical, and well-connected responses",
        "c1_expectations": [
            "Produces extended discourse with coherence",
            "Uses cohesive devices effectively",
            "Develops topics fully without excessive hesitation",
            "Avoids one-word or very brief answers",
        ]
    },
    "pronunciation": {
        "description": "Clarity, intonation, stress, and individual sounds",
        "c1_expectations": [
            "Speaks clearly with appropriate intonation",
            "Uses stress and rhythm for emphasis",
            "Individual sounds are intelligible",
            "Pronunciation doesn't impede understanding",
        ]
    },
    "interactive_communication": {
        "description": "Ability to initiate, respond, and maintain interaction",
        "c1_expectations": [
            "Initiates and maintains interaction appropriately",
            "Responds promptly and relevantly",
            "Listens and shows understanding",
            "Uses strategies to maintain communication",
        ]
    },
    "global_achievement": {
        "description": "Overall effectiveness in communicating at C1 level",
        "c1_expectations": [
            "Achieves communicative goals effectively",
            "Demonstrates overall C1 proficiency",
            "Sustains performance throughout",
            "Shows confidence and fluency",
        ]
    }
}
