# Contributing to the SaaS Architecture Spec-Kit

We welcome contributions to the SaaS Architecture Spec-Kit (saasarch speckit) platform! Your help is essential for making this project better.

## How to Contribute

There are many ways to contribute to the project, including:

- **Reporting Bugs**: If you find a bug, please open an issue in our [issue tracker](https://github.com/vbonk/app-agents/issues).
- **Suggesting Enhancements**: If you have an idea for a new feature or an improvement to an existing one, please open an issue to discuss it.
- **Writing Code**: If you want to contribute code, please follow the steps below.
- **Improving Documentation**: If you find any errors or omissions in the documentation, please submit a pull request with your changes.

## Development Workflow

### 1. Fork the Repository

Start by forking the main repository to your GitHub account.

### 2. Clone Your Fork

Clone your forked repository to your local machine:

```bash
git clone https://github.com/YOUR_USERNAME/app-agents.git
cd saas-spec-driven-development
```

### 3. Create a New Branch

Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes

Make your changes to the codebase. Please ensure that your code follows the project's coding standards and that you have added appropriate tests.

### 5. Run Tests

Before submitting your changes, please run the full test suite to ensure that everything is working correctly:

```bash
./scripts/run_tests.py
```

### 6. Commit Your Changes

Commit your changes with a clear and descriptive commit message:

```bash
git commit -m "feat: add your feature description"
```

### 7. Push to Your Fork

Push your changes to your forked repository:

```bash
git push origin feature/your-feature-name
```

### 8. Create a Pull Request

Open a pull request from your forked repository to the main repository. Please provide a detailed description of your changes and why you think they should be merged.

## Adding New Agents

To add a new agent to the system, please follow these steps:

1.  **Design Phase**: Create a design document for the new agent in the appropriate directory.
2.  **Implementation**: Implement the agent following the development standards.
3.  **Testing**: Create comprehensive tests for the new agent, including integration tests with the Constitution Service.
4.  **Documentation**: Add documentation for the new agent to the `docs/AGENT_REGISTRY.md` file.
5.  **Integration**: Integrate the new agent into the existing agent ecosystem.
6.  **Review**: Submit a pull request for review.

## Code of Conduct

We have a Code of Conduct that we expect all contributors to follow. Please read it before contributing.

Thank you for your contributions!
