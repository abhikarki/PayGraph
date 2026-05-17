from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from graph import builder
from services import poller
from storage.history import init_db
from routers import graph_routes, path_routes, history_routes, status_routes

logging.basicConfig(
    level = logging.INFO,
    format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PayGraph DEX Routing Engine starting up")

    await init_db()
    builder.init_graph()
    await poller.resolve_pair_addresses()

    poll_task = asyncio.create_task(poller.polling_loop())
    logger.info("Background polling loop started")

    yield  #app is live

    logger.info("Shutting down polling loop")
    poll_task.cancel()
    try:
        await poll_task
    except asyncio.CancelledError:
        pass
    logger.info("PayGraph DEX Routing Engine shut down.")


app = FastAPI(
    title = "PayGraph - DEX Routing Engine",
    description = (
        "Real-time DEX liquidity graph buit on Moralis. "
        "Finds optimal swap routes across Uniswap, Sushiswap, and PancakeSwap."
    ),
    version = "1.0.0",
    lifespan = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph_routes.router)
app.include_router(path_routes.router)
app.include_router(history_routes.router)
app.include_router(status_routes.router)

@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "PayGraph-DEX Routing Engine",
        "docs": "/docs",
        "endpoints": ["/graph", "/routes", "/history", "/status"],
    }