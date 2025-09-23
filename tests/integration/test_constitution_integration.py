#!/usr/bin/env python3
"""
Integration tests for the Constitution Service and agent ecosystem.

This test suite validates the complete integration between the Constitution Service
and all agents in the SaaS Architecture Spec-Kit ecosystem.
"""

import asyncio
import json
import pytest
import requests
import time
from typing import Dict, List, Any
from unittest.mock import Mock, patch
import psycopg2
from psycopg2.extras import RealDictCursor


class ConstitutionServiceClient:
    """Client for interacting with the Constitution Service API."""
    
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SaasArch-SpecKit-Test/1.0'
        })
    
    def health_check(self) -> Dict[str, Any]:
        """Check if the Constitution Service is healthy."""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def create_tenant(self, name: str, slug: str) -> Dict[str, Any]:
        """Create a new tenant."""
        data = {"name": name, "slug": slug}
        response = self.session.post(f"{self.base_url}/api/v1/tenants", json=data)
        response.raise_for_status()
        return response.json()
    
    def create_principle(self, principle: str, category: str) -> Dict[str, Any]:
        """Create a new constitutional principle."""
        data = {"principle": principle, "category": category}
        response = self.session.post(f"{self.base_url}/api/v1/principles", json=data)
        response.raise_for_status()
        return response.json()
    
    def evaluate_action(self, action: str, tenant_id: int, metadata: Dict = None) -> Dict[str, Any]:
        """Evaluate an action against constitutional principles."""
        data = {
            "action": action,
            "tenantId": tenant_id,
            "metadata": metadata or {}
        }
        response = self.session.post(f"{self.base_url}/api/v1/evaluate", json=data)
        response.raise_for_status()
        return response.json()
    
    def batch_evaluate(self, actions: List[str], tenant_id: int, metadata: Dict = None) -> Dict[str, Any]:
        """Evaluate multiple actions in batch."""
        data = {
            "actions": actions,
            "tenantId": tenant_id,
            "metadata": metadata or {}
        }
        response = self.session.post(f"{self.base_url}/api/v1/evaluate/batch", json=data)
        response.raise_for_status()
        return response.json()
    
    def search_principles(self, query: str, limit: int = 10, threshold: float = 0.7) -> Dict[str, Any]:
        """Search principles using semantic similarity."""
        data = {
            "query": query,
            "limit": limit,
            "threshold": threshold
        }
        response = self.session.post(f"{self.base_url}/api/v1/principles/search", json=data)
        response.raise_for_status()
        return response.json()


class MockAgent:
    """Mock agent for testing integration patterns."""
    
    def __init__(self, name: str, constitution_client: ConstitutionServiceClient, tenant_id: int):
        self.name = name
        self.constitution_client = constitution_client
        self.tenant_id = tenant_id
        self.actions_log = []
    
    async def validate_action(self, action: str, metadata: Dict = None) -> Dict[str, Any]:
        """Validate an action against constitutional principles."""
        try:
            result = self.constitution_client.evaluate_action(
                action=action,
                tenant_id=self.tenant_id,
                metadata={
                    **(metadata or {}),
                    "agent": self.name,
                    "timestamp": time.time()
                }
            )
            
            self.actions_log.append({
                "action": action,
                "result": result,
                "timestamp": time.time()
            })
            
            return result
        except Exception as e:
            self.actions_log.append({
                "action": action,
                "error": str(e),
                "timestamp": time.time()
            })
            raise
    
    async def perform_constitutional_action(self, action: str, metadata: Dict = None) -> Any:
        """Perform an action only if it passes constitutional validation."""
        validation_result = await self.validate_action(action, metadata)
        
        if validation_result["data"]["compliance"] == "FAIL":
            raise ValueError(f"Action violates constitutional principles: {validation_result['data']['violations']}")
        
        # Simulate action execution
        return {"status": "completed", "action": action, "compliance_score": validation_result["data"]["overallScore"]}


@pytest.fixture(scope="session")
def constitution_client():
    """Fixture providing a Constitution Service client."""
    client = ConstitutionServiceClient()
    
    # Wait for service to be ready
    max_retries = 30
    for i in range(max_retries):
        try:
            client.health_check()
            break
        except requests.exceptions.RequestException:
            if i == max_retries - 1:
                pytest.skip("Constitution Service not available")
            time.sleep(1)
    
    return client


@pytest.fixture(scope="session")
def test_tenant(constitution_client):
    """Fixture providing a test tenant."""
    try:
        tenant = constitution_client.create_tenant(
            name="Integration Test Tenant",
            slug="integration-test"
        )
        return tenant["data"]
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 409:  # Tenant already exists
            # For testing purposes, assume tenant ID 1 exists
            return {"id": 1, "name": "Integration Test Tenant", "slug": "integration-test"}
        raise


@pytest.fixture(scope="session")
def test_principles(constitution_client):
    """Fixture providing test constitutional principles."""
    principles = [
        {
            "principle": "All user data must be encrypted at rest and in transit using industry-standard encryption algorithms",
            "category": "Security"
        },
        {
            "principle": "All user interfaces must be accessible to users with disabilities following WCAG 2.1 AA guidelines",
            "category": "Accessibility"
        },
        {
            "principle": "All API endpoints must implement proper rate limiting to prevent abuse",
            "category": "Security"
        },
        {
            "principle": "All code must be reviewed by at least one other developer before deployment",
            "category": "Quality"
        },
        {
            "principle": "All personal data collection must have explicit user consent and clear privacy policies",
            "category": "Privacy"
        }
    ]
    
    created_principles = []
    for principle_data in principles:
        try:
            principle = constitution_client.create_principle(
                principle=principle_data["principle"],
                category=principle_data["category"]
            )
            created_principles.append(principle["data"])
        except requests.exceptions.HTTPError as e:
            if e.response.status_code != 409:  # Ignore if already exists
                raise
    
    return created_principles


class TestConstitutionServiceBasics:
    """Test basic Constitution Service functionality."""
    
    def test_health_check(self, constitution_client):
        """Test that the Constitution Service health check works."""
        health = constitution_client.health_check()
        assert health["status"] == "healthy"
        assert "service" in health
        assert health["service"] == "constitution-service"
    
    def test_tenant_creation(self, constitution_client):
        """Test tenant creation functionality."""
        tenant_name = f"Test Tenant {int(time.time())}"
        tenant_slug = f"test-tenant-{int(time.time())}"
        
        tenant = constitution_client.create_tenant(tenant_name, tenant_slug)
        
        assert tenant["data"]["name"] == tenant_name
        assert tenant["data"]["slug"] == tenant_slug
        assert tenant["data"]["id"] is not None
    
    def test_principle_creation(self, constitution_client):
        """Test principle creation functionality."""
        principle_text = f"Test principle created at {time.time()}"
        category = "Testing"
        
        principle = constitution_client.create_principle(principle_text, category)
        
        assert principle["data"]["principle"] == principle_text
        assert principle["data"]["category"] == category
        assert principle["data"]["id"] is not None


class TestConstitutionalEvaluation:
    """Test constitutional evaluation functionality."""
    
    def test_security_violation_detection(self, constitution_client, test_tenant, test_principles):
        """Test that security violations are properly detected."""
        # Test action that should violate security principles
        action = "Store user passwords in plain text in the database"
        
        result = constitution_client.evaluate_action(
            action=action,
            tenant_id=test_tenant["id"]
        )
        
        assert result["data"]["compliance"] == "FAIL"
        assert result["data"]["overallScore"] < 0.5
        assert len(result["data"]["violations"]) > 0
        
        # Check that security violations are identified
        security_violations = [v for v in result["data"]["violations"] if v["category"] == "Security"]
        assert len(security_violations) > 0
    
    def test_compliant_action_approval(self, constitution_client, test_tenant, test_principles):
        """Test that compliant actions are approved."""
        # Test action that should be compliant
        action = "Implement JWT-based authentication with bcrypt password hashing and HTTPS encryption"
        
        result = constitution_client.evaluate_action(
            action=action,
            tenant_id=test_tenant["id"]
        )
        
        assert result["data"]["compliance"] in ["PASS", "WARNING"]
        assert result["data"]["overallScore"] > 0.5
    
    def test_batch_evaluation(self, constitution_client, test_tenant, test_principles):
        """Test batch evaluation of multiple actions."""
        actions = [
            "Implement secure user authentication",
            "Store passwords in plain text",
            "Add accessibility features to the UI",
            "Skip input validation for performance"
        ]
        
        result = constitution_client.batch_evaluate(
            actions=actions,
            tenant_id=test_tenant["id"]
        )
        
        assert "data" in result
        assert "results" in result["data"]
        assert len(result["data"]["results"]) == len(actions)
        
        # Check that we have a mix of pass and fail results
        compliance_results = [r["compliance"] for r in result["data"]["results"]]
        assert "FAIL" in compliance_results  # Plain text passwords should fail
        assert "PASS" in compliance_results or "WARNING" in compliance_results  # Secure auth should pass
    
    def test_semantic_search(self, constitution_client, test_principles):
        """Test semantic search functionality."""
        # Search for security-related principles
        result = constitution_client.search_principles(
            query="password encryption security authentication",
            limit=5,
            threshold=0.6
        )
        
        assert "data" in result
        assert len(result["data"]) > 0
        
        # Check that results are relevant to security
        for principle in result["data"]:
            assert "similarity" in principle
            assert principle["similarity"] > 0.6


class TestAgentIntegration:
    """Test integration patterns with mock agents."""
    
    @pytest.mark.asyncio
    async def test_agent_builder_integration(self, constitution_client, test_tenant):
        """Test Agent Builder integration with Constitution Service."""
        agent_builder = MockAgent("agent-builder", constitution_client, test_tenant["id"])
        
        # Test compliant agent creation
        compliant_action = "Create a data processing agent with input validation and error handling"
        result = await agent_builder.perform_constitutional_action(compliant_action)
        
        assert result["status"] == "completed"
        assert result["compliance_score"] > 0.5
        
        # Test non-compliant agent creation
        non_compliant_action = "Create an agent that stores all user data without encryption"
        
        with pytest.raises(ValueError) as exc_info:
            await agent_builder.perform_constitutional_action(non_compliant_action)
        
        assert "violates constitutional principles" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_ui_architect_integration(self, constitution_client, test_tenant):
        """Test UI Architect Agent integration with Constitution Service."""
        ui_architect = MockAgent("ui-architect", constitution_client, test_tenant["id"])
        
        # Test accessible UI design
        accessible_action = "Design a user interface with proper ARIA labels, keyboard navigation, and color contrast"
        result = await ui_architect.perform_constitutional_action(accessible_action)
        
        assert result["status"] == "completed"
        assert result["compliance_score"] > 0.7
        
        # Test inaccessible UI design
        inaccessible_action = "Create a UI with low color contrast and no keyboard navigation support"
        
        with pytest.raises(ValueError) as exc_info:
            await ui_architect.perform_constitutional_action(inaccessible_action)
        
        assert "violates constitutional principles" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_crawler_agent_integration(self, constitution_client, test_tenant):
        """Test Crawler Agent integration with Constitution Service."""
        crawler = MockAgent("crawler", constitution_client, test_tenant["id"])
        
        # Test privacy-compliant crawling
        compliant_action = "Crawl public website data while respecting robots.txt and privacy policies"
        result = await crawler.perform_constitutional_action(compliant_action)
        
        assert result["status"] == "completed"
        assert result["compliance_score"] > 0.5
        
        # Test privacy-violating crawling
        privacy_violating_action = "Scrape personal user data from social media profiles without consent"
        
        with pytest.raises(ValueError) as exc_info:
            await crawler.perform_constitutional_action(privacy_violating_action)
        
        assert "violates constitutional principles" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_multi_agent_workflow(self, constitution_client, test_tenant):
        """Test a complete multi-agent workflow with constitutional compliance."""
        # Create multiple agents
        spec_agent = MockAgent("specification-agent", constitution_client, test_tenant["id"])
        plan_agent = MockAgent("planning-agent", constitution_client, test_tenant["id"])
        impl_agent = MockAgent("implementation-agent", constitution_client, test_tenant["id"])
        
        # Specification phase
        spec_action = "Create specification for secure user authentication system with accessibility features"
        spec_result = await spec_agent.perform_constitutional_action(spec_action)
        assert spec_result["status"] == "completed"
        
        # Planning phase
        plan_action = "Generate development plan including security reviews and accessibility testing"
        plan_result = await plan_agent.perform_constitutional_action(plan_action)
        assert plan_result["status"] == "completed"
        
        # Implementation phase
        impl_action = "Implement authentication system with encrypted password storage and accessible login forms"
        impl_result = await impl_agent.perform_constitutional_action(impl_action)
        assert impl_result["status"] == "completed"
        
        # Verify all agents logged their actions
        assert len(spec_agent.actions_log) > 0
        assert len(plan_agent.actions_log) > 0
        assert len(impl_agent.actions_log) > 0


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_invalid_tenant_id(self, constitution_client):
        """Test handling of invalid tenant ID."""
        with pytest.raises(requests.exceptions.HTTPError) as exc_info:
            constitution_client.evaluate_action(
                action="Test action",
                tenant_id=99999  # Non-existent tenant
            )
        
        assert exc_info.value.response.status_code in [400, 404]
    
    def test_empty_action_evaluation(self, constitution_client, test_tenant):
        """Test handling of empty action."""
        with pytest.raises(requests.exceptions.HTTPError) as exc_info:
            constitution_client.evaluate_action(
                action="",
                tenant_id=test_tenant["id"]
            )
        
        assert exc_info.value.response.status_code == 400
    
    def test_malformed_request(self, constitution_client):
        """Test handling of malformed requests."""
        with pytest.raises(requests.exceptions.HTTPError) as exc_info:
            response = constitution_client.session.post(
                f"{constitution_client.base_url}/api/v1/evaluate",
                json={"invalid": "data"}
            )
            response.raise_for_status()
        
        assert exc_info.value.response.status_code == 400


class TestPerformance:
    """Test performance characteristics of the system."""
    
    def test_evaluation_response_time(self, constitution_client, test_tenant):
        """Test that evaluations complete within reasonable time."""
        action = "Implement user authentication with proper security measures"
        
        start_time = time.time()
        result = constitution_client.evaluate_action(
            action=action,
            tenant_id=test_tenant["id"]
        )
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < 5.0  # Should complete within 5 seconds
        assert result["data"]["compliance"] in ["PASS", "FAIL", "WARNING"]
    
    def test_batch_evaluation_efficiency(self, constitution_client, test_tenant):
        """Test that batch evaluation is more efficient than individual evaluations."""
        actions = [
            "Implement secure authentication",
            "Add input validation",
            "Create accessible UI components",
            "Set up proper error handling",
            "Implement rate limiting"
        ]
        
        # Time batch evaluation
        start_time = time.time()
        batch_result = constitution_client.batch_evaluate(
            actions=actions,
            tenant_id=test_tenant["id"]
        )
        batch_time = time.time() - start_time
        
        # Time individual evaluations
        start_time = time.time()
        individual_results = []
        for action in actions:
            result = constitution_client.evaluate_action(
                action=action,
                tenant_id=test_tenant["id"]
            )
            individual_results.append(result)
        individual_time = time.time() - start_time
        
        # Batch should be more efficient (or at least not significantly slower)
        assert batch_time <= individual_time * 1.2  # Allow 20% overhead
        assert len(batch_result["data"]["results"]) == len(actions)


class TestDataConsistency:
    """Test data consistency and integrity."""
    
    def test_evaluation_logging(self, constitution_client, test_tenant):
        """Test that evaluations are properly logged."""
        action = "Test action for logging verification"
        metadata = {"test": "logging", "timestamp": time.time()}
        
        result = constitution_client.evaluate_action(
            action=action,
            tenant_id=test_tenant["id"],
            metadata=metadata
        )
        
        assert result["data"]["metadata"]["evaluationTime"] > 0
        assert result["data"]["metadata"]["principlesEvaluated"] >= 0
        assert result["data"]["metadata"]["tenantId"] == test_tenant["id"]
    
    def test_principle_search_consistency(self, constitution_client, test_principles):
        """Test that principle search returns consistent results."""
        query = "security authentication encryption"
        
        # Run the same search multiple times
        results = []
        for _ in range(3):
            result = constitution_client.search_principles(query, limit=5)
            results.append(result["data"])
        
        # Results should be consistent
        assert len(results) == 3
        for i in range(1, len(results)):
            assert len(results[i]) == len(results[0])
            # Similarity scores should be identical for the same query
            for j in range(len(results[i])):
                assert abs(results[i][j]["similarity"] - results[0][j]["similarity"]) < 0.001


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"])
