"""
Database Configuration

SQLAlchemy async database setup supporting both PostgreSQL and SQLite.
"""

import logging

from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool, StaticPool

logger = logging.getLogger(__name__)

# Configure engine based on database type
if settings.is_sqlite:
    # SQLite configuration for local development
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        poolclass=StaticPool,  # SQLite works better with StaticPool
        connect_args={"check_same_thread": False},  # Allow multi-threading
    )
    logger.info("🗄️  Using SQLite database for local development")
else:
    # PostgreSQL configuration for production
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        echo=settings.DEBUG,
        poolclass=NullPool if settings.ENVIRONMENT == "test" else None,
    )
    logger.info("🗄️  Using PostgreSQL database")

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
)

# Base class for all models
Base = declarative_base()


async def init_db() -> None:
    """
    Initialize database - create all tables.

    This should be called on application startup.
    """
    try:
        async with engine.begin() as conn:
            # Import all models to register them with SQLAlchemy metadata
            from app.models import Model, User  # noqa: F401

            # Create all tables
            await conn.run_sync(Base.metadata.create_all)

            if settings.is_sqlite:
                logger.info("✅ SQLite database initialized (local development)")
            else:
                logger.info("✅ PostgreSQL database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise


async def get_db() -> AsyncSession:
    """
    Dependency for getting database session.

    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """Close database connections - called on shutdown"""
    await engine.dispose()
    logger.info("✅ Database connections closed")


# Made with Bob
