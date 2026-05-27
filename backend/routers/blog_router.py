"""
Blog posts router: CRUD operations for blog posts.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, get_optional_user
from database import get_db
from models import Post, User
from schemas import PostCreate, PostResponse, PostUpdate

router = APIRouter(prefix="/api/posts", tags=["Posts"])


def _post_to_response(post: Post) -> PostResponse:
    """Convert a Post ORM object (with loaded author) to a PostResponse schema."""
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        author_id=post.author_id,
        author_nickname=post.author.nickname,
        author_avatar=post.author.avatar_path,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


# ---------------------------------------------------------------------------
# GET /api/posts  –  list all posts
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[PostResponse])
def list_posts(db: Session = Depends(get_db)):
    """Return all blog posts ordered by creation date (newest first).

    No authentication required.  Each post includes the author's nickname
    and avatar for display purposes.
    """
    posts = (
        db.query(Post)
        .options(joinedload(Post.author))
        .order_by(Post.created_at.desc())
        .all()
    )
    return [_post_to_response(p) for p in posts]


# ---------------------------------------------------------------------------
# POST /api/posts  –  create a new post
# ---------------------------------------------------------------------------


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new blog post.

    Requires authentication.  The authenticated user is recorded as the
    author.
    """
    post = Post(
        title=payload.title,
        content=payload.content,
        author_id=current_user.id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Ensure the author relationship is loaded for the response
    if post.author is None:
        post.author = current_user

    return _post_to_response(post)


# ---------------------------------------------------------------------------
# GET /api/posts/{post_id}  –  get a single post
# ---------------------------------------------------------------------------


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """Return a single blog post by its ID.

    No authentication required.
    """
    post = (
        db.query(Post)
        .options(joinedload(Post.author))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )
    return _post_to_response(post)


# ---------------------------------------------------------------------------
# PUT /api/posts/{post_id}  –  update a post
# ---------------------------------------------------------------------------


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    payload: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing blog post.

    Requires authentication.  Only the post author or an admin user may
    perform this action.
    """
    post = (
        db.query(Post)
        .options(joinedload(Post.author))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )

    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this post.",
        )

    if payload.title is not None:
        post.title = payload.title
    if payload.content is not None:
        post.content = payload.content

    post.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)

    return _post_to_response(post)


# ---------------------------------------------------------------------------
# DELETE /api/posts/{post_id}  –  delete a post
# ---------------------------------------------------------------------------


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a blog post.

    Requires authentication.  Only the post author or an admin user may
    perform this action.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )

    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this post.",
        )

    db.delete(post)
    db.commit()
    return None
