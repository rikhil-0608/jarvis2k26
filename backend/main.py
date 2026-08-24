import os
import shutil
import uuid
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from core_agent import JarvisAgent
from rag_manager import RAGManager

app = FastAPI(title="JARVIS AI Study Assistant API")

# Configure CORS so React (Vite) frontend can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory configs
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize Core Services
agent = JarvisAgent()
rag_manager = RAGManager(persist_directory="vector_store")

# ==========================================
# Dependency: API Key Verification & Injector
# ==========================================
def verify_api_key(x_gemini_api_key: Optional[str] = Header(None)):
    """
    Checks if an API key is provided via header or environment.
    Dynamically injects it into the active process environment variables.
    """
    key = x_gemini_api_key or os.getenv("GEMINI_API_KEY")
    if not key or key == "your_gemini_api_key_here" or key.strip() == "":
        raise HTTPException(
            status_code=400, 
            detail="GEMINI_API_KEY is missing. Please set it in backend/.env or enter it in the sidebar."
        )
    # Inject into environment for LangChain components
    os.environ["GEMINI_API_KEY"] = key
    os.environ["GOOGLE_API_KEY"] = key
    return key

# ==========================================
# API Models
# ==========================================

class ChatRequest(BaseModel):
    message: str
    session_id: str
    persona: str = "General Tutor"
    use_rag: bool = False

class QuizRequest(BaseModel):
    topic: str
    num_questions: int = 5
    use_rag: bool = False

class FlashcardsRequest(BaseModel):
    topic: str
    num_cards: int = 8
    use_rag: bool = False

class StudyPlanRequest(BaseModel):
    subject: str
    hours_per_week: int = 10
    target_goal: str = "General understanding"

# ==========================================
# Endpoints
# ==========================================

@app.get("/api/status")
def get_status(x_gemini_api_key: Optional[str] = Header(None)):
    """Verify backend and API key status."""
    key = x_gemini_api_key or os.getenv("GEMINI_API_KEY")
    has_key = key is not None and key != "your_gemini_api_key_here" and key.strip() != ""
    return {
        "status": "online",
        "gemini_api_key_configured": has_key,
        "indexed_docs_exist": os.path.exists(os.path.join("vector_store", "index.faiss"))
    }

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, api_key: str = Depends(verify_api_key)):
    """Chat endpoint supporting persona selection and RAG context."""
    context = None
    if request.use_rag:
        # Retrieve context from vector store based on user's query
        docs = rag_manager.query_documents(request.message, k=3)
        if docs:
            context = "\n\n".join([f"[Source: {doc['metadata'].get('source', 'Unknown')}]\n{doc['content']}" for doc in docs])
            
    try:
        response = agent.chat(
            session_id=request.session_id,
            message=request.message,
            persona=request.persona,
            context=context
        )
        return {"response": response, "rag_used": request.use_rag, "rag_context_retrieved": context is not None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), api_key: str = Depends(verify_api_key)):
    """Uploads a file (PDF or TXT) and indexes it in the vector store."""
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, TXT, or MD files.")

    # Save file temporarily
    temp_file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Index the file
        chunks_indexed = rag_manager.process_and_index_document(temp_file_path, file.filename)
        
        return {
            "filename": file.filename,
            "status": "success",
            "message": f"Successfully indexed {file.filename} into {chunks_indexed} sections.",
            "chunks_count": chunks_indexed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/api/generate-quiz")
async def generate_quiz_endpoint(request: QuizRequest, api_key: str = Depends(verify_api_key)):
    """Generate structured multiple-choice quiz questions."""
    context = None
    if request.use_rag:
        docs = rag_manager.query_documents(request.topic, k=5)
        if docs:
            context = "\n\n".join([doc["content"] for doc in docs])
            
    try:
        quiz = agent.generate_quiz(topic=request.topic, num_questions=request.num_questions, context=context)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")

@app.post("/api/generate-flashcards")
async def generate_flashcards_endpoint(request: FlashcardsRequest, api_key: str = Depends(verify_api_key)):
    """Generate structured study flashcards."""
    context = None
    if request.use_rag:
        docs = rag_manager.query_documents(request.topic, k=5)
        if docs:
            context = "\n\n".join([doc["content"] for doc in docs])
            
    try:
        deck = agent.generate_flashcards(topic=request.topic, num_cards=request.num_cards, context=context)
        return deck
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")

@app.post("/api/generate-schedule")
async def generate_schedule_endpoint(request: StudyPlanRequest, api_key: str = Depends(verify_api_key)):
    """Generate structured study schedule."""
    try:
        plan = agent.generate_study_plan(
            subject=request.subject,
            hours_per_week=request.hours_per_week,
            target_goal=request.target_goal
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")

@app.post("/api/clear-chat")
def clear_chat_endpoint(session_id: str):
    """Clear memory of a specific conversation session."""
    agent.clear_session_history(session_id)
    return {"status": "success", "message": f"Chat session history '{session_id}' cleared."}

@app.post("/api/clear-docs")
def clear_docs_endpoint():
    """Clear indexed vector database store."""
    try:
        rag_manager.clear_index()
        return {"status": "success", "message": "All documents cleared and vector database reset."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear vector database: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Read host and port from env or defaults
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    print(f"Starting JARVIS Backend on {host}:{port}...")
    uvicorn.run("main:app", host=host, port=port)
