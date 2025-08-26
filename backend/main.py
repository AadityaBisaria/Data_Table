from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import API routers
from .api.data import router as data_router
from .api.columns import router as columns_router
from .api.stats import router as stats_router

app = FastAPI(
    title="Data Table API",
    description="FastAPI backend for the Data Table application with flexible column selection",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(data_router)
app.include_router(columns_router)
app.include_router(stats_router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Data Table API v2.0",
        "docs": "/docs",
        "endpoints": {
            "data": "/api/data/",
            "columns": "/api/columns/",
            "stats": "/api/stats/"
        }
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)