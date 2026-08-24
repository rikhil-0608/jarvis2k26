import os
from typing import List
# pyrefly: ignore [missing-import]
from pypdf import PdfReader
# pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter
# pyrefly: ignore [missing-import]
from langchain_community.vectorstores import FAISS
# pyrefly: ignore [missing-import]
from langchain_google_genai import GoogleGenerativeAIEmbeddings

class RAGManager:
    def __init__(self, persist_directory: str = "vector_store"):
        self.persist_directory = persist_directory
        self.embeddings = None
        self.vector_store = None
        
    def _initialize_embeddings(self):
        """Lazy load embeddings once GEMINI_API_KEY is available."""
        if not self.embeddings:
            # GoogleGenerativeAIEmbeddings will read GEMINI_API_KEY from environment
            # or we can pass it if we want.
            self.embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text content from a PDF file."""
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                text_content = page.extract_text()
                if text_content:
                    text += text_content + "\n"
        except Exception as e:
            print(f"Error reading PDF {file_path}: {e}")
        return text

    def extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from a plain text file."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            print(f"Error reading TXT {file_path}: {e}")
            return ""

    def process_and_index_document(self, file_path: str, filename: str) -> int:
        """
        Parses a document, splits it into chunks, generates embeddings,
        and adds them to the FAISS index.
        """
        self._initialize_embeddings()
        
        # 1. Extract Text
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            text = self.extract_text_from_pdf(file_path)
        else:
            text = self.extract_text_from_txt(file_path)
            
        if not text.strip():
            raise ValueError("No text could be extracted from the document.")

        # 2. Split Text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_text(text)
        
        # 3. Create metadata
        metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

        # 4. Update Vector Store
        if self.vector_store is None:
            # If a vector store already exists on disk, load it
            if os.path.exists(os.path.join(self.persist_directory, "index.faiss")):
                self.vector_store = FAISS.load_local(
                    self.persist_directory, 
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                self.vector_store.add_texts(chunks, metadatas=metadatas)
            else:
                self.vector_store = FAISS.from_texts(chunks, self.embeddings, metadatas=metadatas)
        else:
            self.vector_store.add_texts(chunks, metadatas=metadatas)
            
        # 5. Persist FAISS store
        os.makedirs(self.persist_directory, exist_ok=True)
        self.vector_store.save_local(self.persist_directory)
        
        return len(chunks)

    def load_index(self) -> bool:
        """Loads FAISS index if it exists."""
        self._initialize_embeddings()
        index_path = os.path.join(self.persist_directory, "index.faiss")
        if os.path.exists(index_path):
            try:
                self.vector_store = FAISS.load_local(
                    self.persist_directory,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                return True
            except Exception as e:
                print(f"Error loading index: {e}")
                return False
        return False

    def query_documents(self, query: str, k: int = 4) -> List[dict]:
        """Retrieve top k matching chunks with metadata."""
        if not self.vector_store:
            loaded = self.load_index()
            if not loaded:
                return []
                
        docs = self.vector_store.similarity_search(query, k=k)
        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })
        return results

    def clear_index(self):
        """Clears the indexed documents by deleting the FAISS vector database."""
        self.vector_store = None
        index_path = os.path.join(self.persist_directory, "index.faiss")
        pkl_path = os.path.join(self.persist_directory, "index.pkl")
        if os.path.exists(index_path):
            os.remove(index_path)
        if os.path.exists(pkl_path):
            os.remove(pkl_path)
        if os.path.exists(self.persist_directory) and not os.listdir(self.persist_directory):
            os.rmdir(self.persist_directory)
