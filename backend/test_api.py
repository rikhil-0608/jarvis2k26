import os
import sys
from dotenv import load_dotenv

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env variables
load_dotenv()

def test_imports():
    print("[*] Testing imports...")
    try:
        from core_agent import JarvisAgent
        from rag_manager import RAGManager
        print("[+] Imports successful!")
        return True
    except Exception as e:
        print(f"[-] Import failed: {e}")
        return False

def test_api_key():
    print("[*] Testing GEMINI_API_KEY...")
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("[!] WARNING: GEMINI_API_KEY environment variable is not set!")
        print("[!] Note: Set GEMINI_API_KEY in backend/.env to use LLM services.")
        return False
    elif key == "your_gemini_api_key_here":
        print("[!] WARNING: GEMINI_API_KEY is still set to placeholder value in .env!")
        return False
    else:
        print(f"[+] GEMINI_API_KEY found (length: {len(key)})")
        return True

def run_tests():
    print("="*50)
    print("JARVIS AI Study Assistant - Backend Verification")
    print("="*50)
    
    imports_ok = test_imports()
    key_ok = test_api_key()
    
    if imports_ok and key_ok:
        print("[*] Instantiating JarvisAgent and RAGManager...")
        try:
            from core_agent import JarvisAgent
            from rag_manager import RAGManager
            
            agent = JarvisAgent()
            rag = RAGManager(persist_directory="test_vector_store")
            
            print("[+] Initialization successful!")
            
            # Create a simple test file
            test_file = "test_note.txt"
            print(f"[*] Creating temporary test file '{test_file}'...")
            with open(test_file, "w", encoding="utf-8") as f:
                f.write(
                    "Photosynthesis is a process used by plants and other organisms to convert light energy "
                    "into chemical energy that, through cellular respiration, can later be released to fuel "
                    "the organisms' activities. This chemical energy is stored in carbohydrate molecules, "
                    "such as sugars and starches, which are synthesized from carbon dioxide and water. "
                    "The process is mediated by chlorophyll pigment."
                )
            
            print("[*] Indexing test document...")
            chunks = rag.process_and_index_document(test_file, test_file)
            print(f"[+] Document indexed successfully in {chunks} chunks.")
            
            print("[*] Querying document...")
            results = rag.query_documents("What is photosynthesis?")
            print(f"[+] Search results returned: {len(results)} matches.")
            if results:
                print(f"    Top match: '{results[0]['content'][:100]}...'")
            
            print("[*] Testing Chat agent with persona Socratic Guide...")
            response = agent.chat(
                session_id="test_session",
                message="Tell me about photosynthesis.",
                persona="Socratic Guide",
                context=results[0]['content'] if results else None
            )
            print(f"[+] Chat Agent response:\n---\n{response}\n---")
            
            print("[*] Testing Quiz Generation...")
            quiz = agent.generate_quiz(topic="Photosynthesis", num_questions=2)
            print(f"[+] Quiz generated with {len(quiz.questions)} questions!")
            for idx, q in enumerate(quiz.questions):
                print(f"    Q{idx+1}: {q.question}")
                print(f"    Options: {q.options}")
                print(f"    Correct index: {q.correct_option_index}")
                print(f"    Explanation: {q.explanation}")
                
            # Clean up test database
            print("[*] Cleaning up test file and test vector store...")
            os.remove(test_file)
            rag.clear_index()
            if os.path.exists("test_vector_store"):
                shutil = __import__("shutil")
                shutil.rmtree("test_vector_store")
            print("[+] Cleaned up successfully.")
            print("\n[+] ALL BACKEND TESTS PASSED SUCCESSFULLY!")
            
        except Exception as e:
            print(f"[-] Run test failed with error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("\n[-] Backend tests skipped or failed due to environment issues.")
    print("="*50)

if __name__ == "__main__":
    run_tests()
