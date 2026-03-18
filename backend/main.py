import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import get_settings
from app.api.routes import router as payment_router
from app.schemas import ErrorResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifecycle"""
    logger.info(" PayGraph API Starting...")
    logger.info(f"Environment: {get_settings().api_env}")
    
    yield
    
    # Shutdown
    logger.info(" PayGraph API Shutting down...")


settings = get_settings()

app = FastAPI(
    title="PayGraph API",
    description="Payment Routing Advisory Platform - Analyze cross-border payment paths",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.is_development else None,  
    redoc_url="/api/redoc" if settings.is_development else None,
    openapi_url="/api/openapi.json" if settings.is_development else None,
)



app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600, 
)

# Allow localhost for development
allowed_hosts = ["localhost", "127.0.0.1", "0.0.0.0"] + settings.cors_origins_list

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    try:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        # Remove server info
        try:
            del response.headers["Server"]
        except KeyError:
            pass
        
        return response
    except Exception as e:
        logger.error(f"Error in security headers middleware: {str(e)}", exc_info=True)
        raise


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    
    logger.info(
        f"{request.method} {request.url.path} "
        f"| Client: {request.client.host if request.client else 'unknown'}"
    )
    
    try:
        response = await call_next(request)
        process_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(
            f"{request.method} {request.url.path} "
            f"| Status: {response.status_code} | Time: {process_time:.2f}s"
        )
        
        return response
    except Exception as e:
        process_time = (datetime.utcnow() - start_time).total_seconds()
        logger.error(
            f"{request.method} {request.url.path} "
            f"| Error: {str(e)} | Time: {process_time:.2f}s"
        )
        raise


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with proper response"""
    logger.warning(f"Validation error: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "Request validation failed",
            "details": [
                {
                    "field": ".".join(str(x) for x in error["loc"][1:]),
                    "message": error["msg"],
                    "type": error["type"]
                }
                for error in exc.errors()
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Unexpected error")
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="internal_error",
            message="An unexpected error occurred"
        ).dict()
    )


app.include_router(payment_router)


@app.get("/")
async def root():
    return {
        "service": "PayGraph API",
        "version": "0.1.0",
        "status": "operational",
        "docs": "/api/docs" if settings.is_development else None
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.is_development,
        log_level="info"
    )
