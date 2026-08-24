import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI
# pyrefly: ignore [missing-import]
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# pyrefly: ignore [missing-import]
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# ==========================================
# Pydantic Schemas for Structured Output
# ==========================================

class QuizQuestion(BaseModel):
    question: str = Field(description="The text of the multiple choice question")
    options: List[str] = Field(description="List of exactly 4 options for the question")
    correct_option_index: int = Field(description="0-based index of the correct option (0 to 3)")
    explanation: str = Field(description="A clear and brief explanation of why this option is correct")

class Quiz(BaseModel):
    title: str = Field(description="Title of the quiz reflecting the subject matter")
    questions: List[QuizQuestion] = Field(description="List of exactly 3 to 10 quiz questions")

class Flashcard(BaseModel):
    front: str = Field(description="Term, question, or core concept (front of the card)")
    back: str = Field(description="Definition, answer, or detailed explanation (back of the card)")

class FlashcardDeck(BaseModel):
    title: str = Field(description="Title of the deck reflecting the subject")
    cards: List[Flashcard] = Field(description="List of 5 to 15 flashcards")

class StudySession(BaseModel):
    day: str = Field(description="Day of the week (e.g., Monday, Tuesday, etc.) or 'Daily'")
    time_slot: str = Field(description="Time slot (e.g., 09:00 AM - 11:00 AM)")
    topic: str = Field(description="Topic/Concept to study during this session")
    activities: List[str] = Field(description="List of suggested activities/tasks (e.g., Read chapter 1, Solve exercises)")

class StudyPlan(BaseModel):
    subject: str = Field(description="The subject or goal of study")
    total_hours: int = Field(description="Total planned hours per week")
    sessions: List[StudySession] = Field(description="List of structured study sessions")
    general_tips: List[str] = Field(description="General study tips specific to this subject")


# ==========================================
# Personas Prompts
# ==========================================

PERSONAS = {
    "General Tutor": (
        "You are JARVIS, a friendly, encouraging, and highly knowledgeable AI Study Assistant. "
        "Your goal is to explain academic concepts clearly and step-by-step. Use formatting, bold text, "
        "and code blocks where relevant. If the user asks a question, break down complex terms into simpler analogies."
    ),
    "Socratic Guide": (
        "You are JARVIS operating in Socratic Mode. Your goal is to help the student learn by asking questions "
        "rather than giving direct answers. Guide them to discover the answers themselves by breaking "
        "the problem down into smaller parts and prompting them with hints, guiding questions, and validation."
    ),
    "Coding Mentor": (
        "You are JARVIS, an expert software developer and coding mentor. Explain computer science and programming "
        "concepts in detail. When asked to write code, provide clean, documented, and modular code examples. "
        "Include brief explanations of how the code works and suggest exercises the user can write to practice."
    ),
    "Literature Critic": (
        "You are JARVIS, a literary analysis and essay critique agent. Help the user analyze texts, construct "
        "theses, outline essays, or evaluate arguments. Provide deep insights, historical context, and suggestions "
        "for style, structure, and evidence in writing."
    )
}


# ==========================================
# Core AI Assistant Class
# ==========================================

class JarvisAgent:
    def __init__(self):
        # We lazy-load the LLM models so that we don't throw key errors upon import if key is not loaded yet.
        self._llm = None
        self._structured_llm_quiz = None
        self._structured_llm_flashcards = None
        self._structured_llm_planner = None
        # Memory storage: session_id -> list of langchain messages
        self.sessions: Dict[str, List[Any]] = {}

    def _init_llm(self):
        if not self._llm:
            # Main model used for conversations
            self._llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.5)
            # Structured models
            self._structured_llm_quiz = self._llm.with_structured_output(Quiz)
            self._structured_llm_flashcards = self._llm.with_structured_output(FlashcardDeck)
            self._structured_llm_planner = self._llm.with_structured_output(StudyPlan)

    def get_session_history(self, session_id: str) -> List[Any]:
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        return self.sessions[session_id]

    def clear_session_history(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id] = []

    def chat(self, session_id: str, message: str, persona: str = "General Tutor", context: Optional[str] = None) -> str:
        """Runs conversational chat with memory and optional RAG context."""
        self._init_llm()
        
        # Get or initialize history
        history = self.get_session_history(session_id)
        
        # Prepare system prompt
        system_instruction = PERSONAS.get(persona, PERSONAS["General Tutor"])
        if context:
            system_instruction += (
                f"\n\nYou also have access to the following relevant context from uploaded documents:\n"
                f"--- CONTEXT START ---\n{context}\n--- CONTEXT END ---\n\n"
                f"Ensure you use this context to inform your answer. If the context does not contain "
                f"the information needed, rely on your own knowledge but mention that the context was insufficient."
            )
            
        # Build messages list
        messages = [SystemMessage(content=system_instruction)]
        
        # Add historical context (limit memory to last 10 messages to keep within context limits and keep it fast)
        messages.extend(history[-10:])
        
        # Add new user message
        messages.append(HumanMessage(content=message))
        
        # Invoke LLM
        # Invoke LLM
        response = self._llm.invoke(messages)
        
        # Extract text content cleanly
        content = response.content
        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, str):
                    text_parts.append(part)
                elif isinstance(part, dict) and "text" in part:
                    text_parts.append(part["text"])
            response_text = "".join(text_parts)
        else:
            response_text = str(content)

        # Save to memory (exclude system prompt)
        history.append(HumanMessage(content=message))
        history.append(AIMessage(content=response_text))
        
        return response_text

    def generate_quiz(self, topic: str, num_questions: int = 5, context: Optional[str] = None) -> Quiz:
        """Generates a structured multiple choice quiz using Gemini's structured output."""
        self._init_llm()
        
        prompt = (
            f"Generate a structured quiz on the topic: '{topic}' containing exactly {num_questions} questions. "
            "Ensure the questions vary in difficulty. Provide 4 distinct options for each question."
        )
        if context:
            prompt += (
                f"\n\nUse the following provided text context to base the quiz questions on:\n"
                f"--- CONTEXT START ---\n{context}\n--- CONTEXT END ---"
            )
            
        response = self._structured_llm_quiz.invoke(prompt)
        return response

    def generate_flashcards(self, topic: str, num_cards: int = 8, context: Optional[str] = None) -> FlashcardDeck:
        """Extracts concepts into a deck of structured flashcards (Front/Back)."""
        self._init_llm()
        
        prompt = (
            f"Create a flashcard deck on the topic: '{topic}' with exactly {num_cards} cards. "
            "The front of each card should be a clear concept, term, or question, and the back should be its "
            "clear explanation, definition, or answer."
        )
        if context:
            prompt += (
                f"\n\nExtract flashcards strictly from the following context:\n"
                f"--- CONTEXT START ---\n{context}\n--- CONTEXT END ---"
            )
            
        response = self._structured_llm_flashcards.invoke(prompt)
        return response

    def generate_study_plan(self, subject: str, hours_per_week: int = 10, target_goal: str = "General understanding") -> StudyPlan:
        """Generates a weekly study plan based on hours and goals."""
        self._init_llm()
        
        prompt = (
            f"Create a custom study plan for the subject/topic: '{subject}'. "
            f"The student can allocate {hours_per_week} hours per week. "
            f"Their specific goal is: '{target_goal}'. "
            f"Structure the response as a list of study sessions distributed across the week."
        )
        response = self._structured_llm_planner.invoke(prompt)
        return response
