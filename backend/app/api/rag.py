from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag.rag_service import RAGService

router = APIRouter(prefix="/api/rag", tags=["RAG"])
rag_service = RAGService()

class LoadRequest(BaseModel):
    doc_id: str
    file_path: str

class QueryRequest(BaseModel):
    doc_id: str
    question: str

@router.post("/load")
def load_document(req: LoadRequest):
    rag_service.load_document(req.doc_id, req.file_path)
    return {"message": f"Document {req.doc_id} loaded"}

@router.post("/query")
def query_rag(req: QueryRequest):
    chunks = rag_service.query(req.doc_id, req.question)
    return {
        "doc_id": req.doc_id,
        "question": req.question,
        "retrieved_chunks": chunks
    }

@router.post("/ask")
def ask_rag(req: QueryRequest):
    result = rag_service.answer(req.doc_id, req.question)
    return result
