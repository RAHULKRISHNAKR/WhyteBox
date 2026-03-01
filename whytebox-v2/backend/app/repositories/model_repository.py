"""
Repository for model data access operations.
"""
from typing import List, Optional

from sqlalchemy import and_, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.model import Model
from app.schemas.model import ModelSearchQuery, ModelStatus


class ModelRepository:
    """Repository for model database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(self, model: Model) -> Model:
        """Create a new model in the database."""
        self.db.add(model)
        await self.db.commit()
        await self.db.refresh(model)
        return model

    async def get_by_id(self, model_id: str) -> Optional[Model]:
        """Get a model by ID."""
        result = await self.db.execute(select(Model).where(Model.id == model_id))
        return result.scalar_one_or_none()

    async def get_by_hash(self, file_hash: str) -> Optional[Model]:
        """Get a model by file hash."""
        result = await self.db.execute(select(Model).where(Model.file_hash == file_hash))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 10,
        user_id: Optional[str] = None,
        status: Optional[ModelStatus] = None,
    ) -> List[Model]:
        """Get all models with pagination and optional filtering."""
        query = select(Model)

        # Apply filters
        filters = []
        if user_id:
            filters.append(Model.user_id == user_id)
        if status:
            filters.append(Model.status == status.value)

        if filters:
            query = query.where(and_(*filters))

        # Apply pagination and ordering
        query = query.order_by(desc(Model.created_at)).offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search(self, search_query: ModelSearchQuery, user_id: Optional[str] = None) -> tuple[List[Model], int]:
        """
        Search models with advanced filtering.
        
        Returns:
            Tuple of (models, total_count)
        """
        # Base query
        query = select(Model)
        count_query = select(func.count(Model.id))

        # Build filters
        filters = []

        # User filter (if provided)
        if user_id:
            filters.append(Model.user_id == user_id)

        # Text search (name or description)
        if search_query.query:
            search_term = f"%{search_query.query}%"
            filters.append(
                or_(
                    Model.name.ilike(search_term),
                    Model.description.ilike(search_term),
                )
            )

        # Type filter
        if search_query.type:
            filters.append(Model.type == search_query.type.value)

        # Framework filter
        if search_query.framework:
            filters.append(Model.framework == search_query.framework.value)

        # Status filter
        if search_query.status:
            filters.append(Model.status == search_query.status.value)

        # Visibility filter
        if search_query.is_public is not None:
            filters.append(Model.is_public == int(search_query.is_public))

        # Pretrained filter
        if search_query.is_pretrained is not None:
            filters.append(Model.is_pretrained == int(search_query.is_pretrained))

        # Accuracy filter
        if search_query.min_accuracy is not None:
            filters.append(Model.accuracy >= search_query.min_accuracy)

        # Parameters filter
        if search_query.max_params is not None:
            filters.append(Model.total_params <= search_query.max_params)

        # Apply filters
        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        # Get total count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Apply sorting
        sort_column = getattr(Model, search_query.sort_by, Model.created_at)
        if search_query.sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)

        # Apply pagination
        skip = (search_query.page - 1) * search_query.page_size
        query = query.offset(skip).limit(search_query.page_size)

        # Execute query
        result = await self.db.execute(query)
        models = list(result.scalars().all())

        return models, total

    async def update(self, model: Model) -> Model:
        """Update a model in the database."""
        await self.db.commit()
        await self.db.refresh(model)
        return model

    async def delete(self, model: Model) -> None:
        """Delete a model from the database."""
        await self.db.delete(model)
        await self.db.commit()

    async def get_by_user(
        self, user_id: str, skip: int = 0, limit: int = 10
    ) -> List[Model]:
        """Get all models for a specific user."""
        query = (
            select(Model)
            .where(Model.user_id == user_id)
            .order_by(desc(Model.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: str) -> int:
        """Count total models for a user."""
        result = await self.db.execute(
            select(func.count(Model.id)).where(Model.user_id == user_id)
        )
        return result.scalar_one()

    async def get_public_models(self, skip: int = 0, limit: int = 10) -> List[Model]:
        """Get all public models."""
        query = (
            select(Model)
            .where(Model.is_public == 1)
            .where(Model.status == ModelStatus.ACTIVE.value)
            .order_by(desc(Model.download_count))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_pretrained_models(
        self, skip: int = 0, limit: int = 10
    ) -> List[Model]:
        """Get all pretrained models."""
        query = (
            select(Model)
            .where(Model.is_pretrained == 1)
            .where(Model.status == ModelStatus.ACTIVE.value)
            .order_by(desc(Model.download_count))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_popular_models(self, limit: int = 10) -> List[Model]:
        """Get most popular models by inference count."""
        query = (
            select(Model)
            .where(Model.status == ModelStatus.ACTIVE.value)
            .order_by(desc(Model.inference_count))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_recent_models(self, limit: int = 10) -> List[Model]:
        """Get most recently created models."""
        query = (
            select(Model)
            .where(Model.status == ModelStatus.ACTIVE.value)
            .order_by(desc(Model.created_at))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def increment_inference_count(self, model_id: str) -> None:
        """Increment inference count for a model."""
        model = await self.get_by_id(model_id)
        if model:
            model.increment_inference_count()
            await self.db.commit()

    async def increment_download_count(self, model_id: str) -> None:
        """Increment download count for a model."""
        model = await self.get_by_id(model_id)
        if model:
            model.increment_download_count()
            await self.db.commit()

    async def update_status(self, model_id: str, status: ModelStatus) -> Optional[Model]:
        """Update model status."""
        model = await self.get_by_id(model_id)
        if model:
            model.status = status.value
            await self.db.commit()
            await self.db.refresh(model)
        return model

    async def exists(self, model_id: str) -> bool:
        """Check if a model exists."""
        result = await self.db.execute(
            select(func.count(Model.id)).where(Model.id == model_id)
        )
        count = result.scalar_one()
        return count > 0

    async def get_statistics(self, user_id: Optional[str] = None) -> dict:
        """Get model statistics."""
        query = select(
            func.count(Model.id).label("total_models"),
            func.sum(Model.file_size).label("total_size"),
            func.avg(Model.accuracy).label("avg_accuracy"),
            func.sum(Model.inference_count).label("total_inferences"),
        )

        if user_id:
            query = query.where(Model.user_id == user_id)

        result = await self.db.execute(query)
        row = result.one()

        return {
            "total_models": row.total_models or 0,
            "total_size_bytes": row.total_size or 0,
            "total_size_mb": (row.total_size or 0) / (1024 * 1024),
            "avg_accuracy": float(row.avg_accuracy) if row.avg_accuracy else None,
            "total_inferences": row.total_inferences or 0,
        }

# Made with Bob
