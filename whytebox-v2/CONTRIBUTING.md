# Contributing to WhyteBox

Thank you for your interest in contributing to WhyteBox! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git
- Docker (optional, for containerized development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/WhyteBox.git
   cd WhyteBox/whytebox-v2
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/WhyteBox.git
   ```

## Development Setup

### Quick Setup

```bash
# Install all dependencies and set up the project
make setup

# Or manually:
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt

# Frontend
cd frontend
npm install

# Install pre-commit hooks
pre-commit install
```

### Environment Configuration

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your settings
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow the project's code style
- Add tests for new features
- Update documentation as needed

### 3. Run Tests

```bash
# Run all tests
make test

# Run specific tests
make test-backend
make test-frontend

# Run with coverage
make test-cov
```

### 4. Check Code Quality

```bash
# Run all linters
make lint

# Format code
make format

# Type checking
make type-check
```

### 5. Commit Changes

```bash
git add .
git commit -m "type: description"
```

See [Commit Messages](#commit-messages) for guidelines.

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### Python (Backend)

- **Formatter:** Black (line length: 100)
- **Import Sorting:** isort (Black-compatible profile)
- **Linter:** Flake8
- **Type Checker:** mypy
- **Security:** Bandit

```bash
# Format Python code
cd backend
black .
isort .

# Check linting
flake8 .
mypy app/
```

### TypeScript/JavaScript (Frontend)

- **Formatter:** Prettier
- **Linter:** ESLint
- **Style Guide:** Airbnb (with modifications)

```bash
# Format frontend code
cd frontend
npm run format

# Check linting
npm run lint

# Type checking
npm run type-check
```

### General Guidelines

- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Follow SOLID principles
- Write tests for new code

## Testing

### Backend Tests

```bash
cd backend
pytest                          # Run all tests
pytest tests/unit              # Run unit tests
pytest tests/integration       # Run integration tests
pytest -v --cov=app            # Run with coverage
```

Test structure:
```
backend/tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── conftest.py     # Shared fixtures
```

### Frontend Tests

```bash
cd frontend
npm run test                    # Run all tests
npm run test -- --watch        # Watch mode
npm run test -- --coverage     # With coverage
```

Test structure:
```
frontend/src/
├── components/
│   └── __tests__/
├── pages/
│   └── __tests__/
└── utils/
    └── __tests__/
```

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

Example (Python):
```python
def test_model_loading_success():
    # Arrange
    model_id = "vgg16"
    
    # Act
    result = load_model(model_id)
    
    # Assert
    assert result.status == "success"
    assert result.model_id == model_id
```

Example (TypeScript):
```typescript
describe('ModelCard', () => {
  it('should render model information', () => {
    // Arrange
    const model = { id: '1', name: 'VGG16' };
    
    // Act
    render(<ModelCard model={model} />);
    
    // Assert
    expect(screen.getByText('VGG16')).toBeInTheDocument();
  });
});
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
feat(backend): add model upload endpoint

Implement POST /api/v1/models/upload endpoint for uploading
custom neural network models. Supports PyTorch and TensorFlow formats.

Closes #123
```

```bash
fix(frontend): resolve 3D visualization rendering issue

Fixed BabylonJS scene not rendering on Safari by updating
the engine initialization parameters.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass
2. ✅ Code is formatted and linted
3. ✅ Documentation is updated
4. ✅ Commit messages follow conventions
5. ✅ Branch is up to date with main

```bash
# Update your branch
git fetch upstream
git rebase upstream/main
```

### PR Template

When creating a PR, include:

- **Description:** What changes were made and why
- **Type:** Feature, Bug Fix, Documentation, etc.
- **Testing:** How the changes were tested
- **Screenshots:** For UI changes
- **Breaking Changes:** If any
- **Related Issues:** Link to related issues

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer approval required
3. All review comments must be addressed
4. No merge conflicts

### After Merge

1. Delete your feature branch
2. Pull the latest main branch
3. Celebrate! 🎉

## Project Structure

```
whytebox-v2/
├── backend/              # Python FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core functionality
│   │   ├── models/      # Database models
│   │   └── services/    # Business logic
│   └── tests/           # Backend tests
├── frontend/            # React TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── store/       # State management
│   │   └── babylon/     # 3D visualization
│   └── public/          # Static assets
├── infrastructure/      # Docker and deployment
└── docs/               # Documentation
```

## Additional Resources

- [Project README](README.md)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Development Guide](LOCAL_DEVELOPMENT.md)

## Questions?

- Open an issue for bugs or feature requests
- Join our community discussions
- Contact the maintainers

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for contributing to WhyteBox! 🚀