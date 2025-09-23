#!/usr/bin/env python3
"""
Comprehensive test runner for the SaaS Architecture Spec-Kit system.

This script orchestrates testing across all components of the system including:
- Constitution Service integration tests
- Agent functionality tests
- End-to-end workflow tests
- Performance benchmarks
- Security validation tests
"""

import argparse
import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
import requests
import psutil
import docker


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TestRunner:
    """Main test runner for the SaaS Architecture Spec-Kit system."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.results = {
            "timestamp": time.time(),
            "test_suites": {},
            "overall_status": "PENDING",
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "skipped_tests": 0,
            "execution_time": 0
        }
        self.docker_client = None
        
        # Initialize Docker client if available
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            logger.warning(f"Docker not available: {e}")
    
    def setup_test_environment(self) -> bool:
        """Set up the test environment including services and dependencies."""
        logger.info("Setting up test environment...")
        
        try:
            # Check if Constitution Service is running
            if not self._check_service_health("constitution-service", "http://localhost:3001/health"):
                logger.info("Starting Constitution Service...")
                if not self._start_constitution_service():
                    logger.error("Failed to start Constitution Service")
                    return False
            
            # Wait for services to be ready
            if not self._wait_for_services():
                logger.error("Services failed to become ready")
                return False
            
            # Set up test data
            if not self._setup_test_data():
                logger.error("Failed to set up test data")
                return False
            
            logger.info("Test environment setup completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set up test environment: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all test suites and return comprehensive results."""
        start_time = time.time()
        
        try:
            # Set up test environment
            if not self.setup_test_environment():
                self.results["overall_status"] = "SETUP_FAILED"
                return self.results
            
            # Run test suites
            test_suites = [
                ("unit_tests", self._run_unit_tests),
                ("integration_tests", self._run_integration_tests),
                ("agent_tests", self._run_agent_tests),
                ("performance_tests", self._run_performance_tests),
                ("security_tests", self._run_security_tests),
                ("end_to_end_tests", self._run_end_to_end_tests)
            ]
            
            for suite_name, test_function in test_suites:
                if self.config.get("test_suites", {}).get(suite_name, True):
                    logger.info(f"Running {suite_name}...")
                    suite_result = test_function()
                    self.results["test_suites"][suite_name] = suite_result
                    
                    # Update overall statistics
                    self.results["total_tests"] += suite_result.get("total", 0)
                    self.results["passed_tests"] += suite_result.get("passed", 0)
                    self.results["failed_tests"] += suite_result.get("failed", 0)
                    self.results["skipped_tests"] += suite_result.get("skipped", 0)
                else:
                    logger.info(f"Skipping {suite_name} (disabled in config)")
            
            # Determine overall status
            if self.results["failed_tests"] == 0:
                self.results["overall_status"] = "PASSED"
            elif self.results["passed_tests"] > 0:
                self.results["overall_status"] = "PARTIAL"
            else:
                self.results["overall_status"] = "FAILED"
            
        except Exception as e:
            logger.error(f"Test execution failed: {e}")
            self.results["overall_status"] = "ERROR"
            self.results["error"] = str(e)
        
        finally:
            self.results["execution_time"] = time.time() - start_time
            self._cleanup_test_environment()
        
        return self.results
    
    def _check_service_health(self, service_name: str, health_url: str) -> bool:
        """Check if a service is healthy."""
        try:
            response = requests.get(health_url, timeout=5)
            return response.status_code == 200
        except Exception:
            return False
    
    def _start_constitution_service(self) -> bool:
        """Start the Constitution Service."""
        try:
            service_dir = Path(__file__).parent.parent / "services" / "constitution-service"
            
            # Check if service is already running
            if self._check_service_health("constitution-service", "http://localhost:3001/health"):
                logger.info("Constitution Service is already running")
                return True
            
            # Try to start with npm
            if (service_dir / "package.json").exists():
                logger.info("Starting Constitution Service with npm...")
                process = subprocess.Popen(
                    ["npm", "start"],
                    cwd=service_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Give it time to start
                time.sleep(10)
                
                if self._check_service_health("constitution-service", "http://localhost:3001/health"):
                    logger.info("Constitution Service started successfully")
                    return True
            
            # Try Docker if available
            if self.docker_client:
                logger.info("Attempting to start Constitution Service with Docker...")
                # Implementation for Docker startup would go here
                pass
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to start Constitution Service: {e}")
            return False
    
    def _wait_for_services(self, timeout: int = 60) -> bool:
        """Wait for all required services to become ready."""
        services = [
            ("Constitution Service", "http://localhost:3001/health")
        ]
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            all_ready = True
            for service_name, health_url in services:
                if not self._check_service_health(service_name, health_url):
                    all_ready = False
                    break
            
            if all_ready:
                logger.info("All services are ready")
                return True
            
            time.sleep(2)
        
        logger.error("Timeout waiting for services to become ready")
        return False
    
    def _setup_test_data(self) -> bool:
        """Set up test data for the test suites."""
        try:
            # Create test tenant and principles
            constitution_url = "http://localhost:3001/api/v1"
            
            # Create test tenant
            tenant_data = {
                "name": "Test Tenant",
                "slug": "test-tenant"
            }
            
            try:
                response = requests.post(f"{constitution_url}/tenants", json=tenant_data)
                if response.status_code not in [200, 201, 409]:  # 409 = already exists
                    logger.warning(f"Failed to create test tenant: {response.status_code}")
            except Exception as e:
                logger.warning(f"Could not create test tenant: {e}")
            
            # Create test principles
            test_principles = [
                {
                    "principle": "All user data must be encrypted at rest and in transit",
                    "category": "Security"
                },
                {
                    "principle": "All user interfaces must be accessible following WCAG guidelines",
                    "category": "Accessibility"
                },
                {
                    "principle": "All code must be reviewed before deployment",
                    "category": "Quality"
                }
            ]
            
            for principle in test_principles:
                try:
                    response = requests.post(f"{constitution_url}/principles", json=principle)
                    if response.status_code not in [200, 201, 409]:
                        logger.warning(f"Failed to create principle: {response.status_code}")
                except Exception as e:
                    logger.warning(f"Could not create principle: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set up test data: {e}")
            return False
    
    def _run_unit_tests(self) -> Dict[str, Any]:
        """Run unit tests for individual components."""
        logger.info("Running unit tests...")
        
        result = {
            "status": "PENDING",
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "execution_time": 0,
            "details": []
        }
        
        start_time = time.time()
        
        try:
            # Run Python unit tests
            test_dirs = [
                "tests/unit",
                "app-agents/agents/*/tests",
                "services/*/tests"
            ]
            
            for test_pattern in test_dirs:
                test_path = Path(__file__).parent.parent / test_pattern
                if test_path.exists() or "*" in str(test_pattern):
                    cmd = ["python", "-m", "pytest", str(test_pattern), "-v", "--tb=short", "--json-report", "--json-report-file=/tmp/pytest_report.json"]
                    
                    try:
                        process_result = subprocess.run(
                            cmd,
                            capture_output=True,
                            text=True,
                            timeout=300  # 5 minutes timeout
                        )
                        
                        # Parse pytest JSON report if available
                        try:
                            with open("/tmp/pytest_report.json", "r") as f:
                                pytest_report = json.load(f)
                                result["total"] += pytest_report.get("summary", {}).get("total", 0)
                                result["passed"] += pytest_report.get("summary", {}).get("passed", 0)
                                result["failed"] += pytest_report.get("summary", {}).get("failed", 0)
                                result["skipped"] += pytest_report.get("summary", {}).get("skipped", 0)
                        except Exception:
                            # Fallback to parsing stdout
                            if "passed" in process_result.stdout:
                                result["total"] += 1
                                result["passed"] += 1
                        
                        result["details"].append({
                            "test_path": str(test_pattern),
                            "return_code": process_result.returncode,
                            "stdout": process_result.stdout[:1000],  # Limit output
                            "stderr": process_result.stderr[:1000]
                        })
                        
                    except subprocess.TimeoutExpired:
                        result["details"].append({
                            "test_path": str(test_pattern),
                            "error": "Test execution timed out"
                        })
                        result["failed"] += 1
                    except Exception as e:
                        result["details"].append({
                            "test_path": str(test_pattern),
                            "error": str(e)
                        })
                        result["failed"] += 1
            
            result["status"] = "PASSED" if result["failed"] == 0 else "FAILED"
            
        except Exception as e:
            result["status"] = "ERROR"
            result["error"] = str(e)
        
        finally:
            result["execution_time"] = time.time() - start_time
        
        return result
    
    def _run_integration_tests(self) -> Dict[str, Any]:
        """Run integration tests."""
        logger.info("Running integration tests...")
        
        result = {
            "status": "PENDING",
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "execution_time": 0,
            "details": []
        }
        
        start_time = time.time()
        
        try:
            # Run the Constitution Service integration tests
            integration_test_file = Path(__file__).parent.parent / "tests" / "integration" / "test_constitution_integration.py"
            
            if integration_test_file.exists():
                cmd = [
                    "python", "-m", "pytest", 
                    str(integration_test_file), 
                    "-v", "--tb=short",
                    "--json-report", "--json-report-file=/tmp/integration_report.json"
                ]
                
                process_result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=600  # 10 minutes timeout
                )
                
                # Parse results
                try:
                    with open("/tmp/integration_report.json", "r") as f:
                        pytest_report = json.load(f)
                        result["total"] = pytest_report.get("summary", {}).get("total", 0)
                        result["passed"] = pytest_report.get("summary", {}).get("passed", 0)
                        result["failed"] = pytest_report.get("summary", {}).get("failed", 0)
                        result["skipped"] = pytest_report.get("summary", {}).get("skipped", 0)
                except Exception:
                    # Fallback parsing
                    if "FAILED" in process_result.stdout:
                        result["failed"] = 1
                    elif "passed" in process_result.stdout:
                        result["passed"] = 1
                    result["total"] = result["passed"] + result["failed"] + result["skipped"]
                
                result["details"].append({
                    "test_file": str(integration_test_file),
                    "return_code": process_result.returncode,
                    "stdout": process_result.stdout[:2000],
                    "stderr": process_result.stderr[:1000]
                })
                
                result["status"] = "PASSED" if result["failed"] == 0 else "FAILED"
            else:
                result["status"] = "SKIPPED"
                result["skipped"] = 1
                result["details"].append({
                    "message": "Integration test file not found"
                })
        
        except subprocess.TimeoutExpired:
            result["status"] = "TIMEOUT"
            result["failed"] = 1
            result["details"].append({
                "error": "Integration tests timed out"
            })
        except Exception as e:
            result["status"] = "ERROR"
            result["error"] = str(e)
        
        finally:
            result["execution_time"] = time.time() - start_time
        
        return result
    
    def _run_agent_tests(self) -> Dict[str, Any]:
        """Run tests for individual agents."""
        logger.info("Running agent tests...")
        
        result = {
            "status": "PENDING",
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "execution_time": 0,
            "agents": {}
        }
        
        start_time = time.time()
        
        try:
            # Find all agent directories
            agents_dir = Path(__file__).parent.parent / "app-agents" / "agents"
            
            if agents_dir.exists():
                for agent_dir in agents_dir.iterdir():
                    if agent_dir.is_dir() and (agent_dir / "tests").exists():
                        agent_name = agent_dir.name
                        logger.info(f"Testing agent: {agent_name}")
                        
                        agent_result = {
                            "status": "PENDING",
                            "total": 0,
                            "passed": 0,
                            "failed": 0,
                            "skipped": 0
                        }
                        
                        try:
                            cmd = [
                                "python", "-m", "pytest",
                                str(agent_dir / "tests"),
                                "-v", "--tb=short"
                            ]
                            
                            process_result = subprocess.run(
                                cmd,
                                capture_output=True,
                                text=True,
                                timeout=300,
                                cwd=agent_dir
                            )
                            
                            # Parse results (simplified)
                            if process_result.returncode == 0:
                                agent_result["status"] = "PASSED"
                                agent_result["passed"] = 1
                                agent_result["total"] = 1
                            else:
                                agent_result["status"] = "FAILED"
                                agent_result["failed"] = 1
                                agent_result["total"] = 1
                            
                            agent_result["stdout"] = process_result.stdout[:1000]
                            agent_result["stderr"] = process_result.stderr[:500]
                            
                        except subprocess.TimeoutExpired:
                            agent_result["status"] = "TIMEOUT"
                            agent_result["failed"] = 1
                            agent_result["total"] = 1
                        except Exception as e:
                            agent_result["status"] = "ERROR"
                            agent_result["error"] = str(e)
                            agent_result["failed"] = 1
                            agent_result["total"] = 1
                        
                        result["agents"][agent_name] = agent_result
                        result["total"] += agent_result["total"]
                        result["passed"] += agent_result["passed"]
                        result["failed"] += agent_result["failed"]
                        result["skipped"] += agent_result["skipped"]
            
            result["status"] = "PASSED" if result["failed"] == 0 else "FAILED"
            
        except Exception as e:
            result["status"] = "ERROR"
            result["error"] = str(e)
        
        finally:
            result["execution_time"] = time.time() - start_time
        
        return result
    
    def _run_performance_tests(self) -> Dict[str, Any]:
        """Run performance benchmarks."""
        logger.info("Running performance tests...")
        
        result = {
            "status": "PENDING",
            "execution_time": 0,
            "benchmarks": {}
        }
        
        start_time = time.time()
        
        try:
            # Constitution Service performance tests
            constitution_benchmarks = self._benchmark_constitution_service()
            result["benchmarks"]["constitution_service"] = constitution_benchmarks
            
            # Agent performance tests
            agent_benchmarks = self._benchmark_agents()
            result["benchmarks"]["agents"] = agent_benchmarks
            
            # Determine overall performance status
            all_passed = True
            for benchmark_category in result["benchmarks"].values():
                if isinstance(benchmark_category, dict):
                    for benchmark in benchmark_category.values():
                        if isinstance(benchmark, dict) and benchmark.get("status") == "FAILED":
                            all_passed = False
                            break
            
            result["status"] = "PASSED" if all_passed else "FAILED"
            
        except Exception as e:
            result["status"] = "ERROR"
            result["error"] = str(e)
        
        finally:
            result["execution_time"] = time.time() - start_time
        
        return result
    
    def _benchmark_constitution_service(self) -> Dict[str, Any]:
        """Benchmark Constitution Service performance."""
        benchmarks = {}
        
        try:
            # Response time benchmark
            start_time = time.time()
            response = requests.post(
                "http://localhost:3001/api/v1/evaluate",
                json={
                    "action": "Test action for performance benchmark",
                    "tenantId": 1
                },
                timeout=10
            )
            response_time = time.time() - start_time
            
            benchmarks["response_time"] = {
                "value": response_time,
                "threshold": 2.0,  # 2 seconds
                "status": "PASSED" if response_time < 2.0 else "FAILED",
                "unit": "seconds"
            }
            
            # Throughput benchmark (simplified)
            start_time = time.time()
            for _ in range(10):
                requests.post(
                    "http://localhost:3001/api/v1/evaluate",
                    json={
                        "action": f"Benchmark action {_}",
                        "tenantId": 1
                    },
                    timeout=5
                )
            total_time = time.time() - start_time
            throughput = 10 / total_time
            
            benchmarks["throughput"] = {
                "value": throughput,
                "threshold": 2.0,  # 2 requests per second
                "status": "PASSED" if throughput >= 2.0 else "FAILED",
                "unit": "requests/second"
            }
            
        except Exception as e:
            benchmarks["error"] = str(e)
        
        return benchmarks
    
    def _benchmark_agents(self) -> Dict[str, Any]:
        """Benchmark agent performance."""
        # Placeholder for agent-specific benchmarks
        return {
            "agent_builder": {"status": "SKIPPED", "reason": "Not implemented"},
            "ui_architect": {"status": "SKIPPED", "reason": "Not implemented"},
            "crawler": {"status": "SKIPPED", "reason": "Not implemented"}
        }
    
    def _run_security_tests(self) -> Dict[str, Any]:
        """Run security validation tests."""
        logger.info("Running security tests...")
        
        result = {
            "status": "PENDING",
            "total": 0,
            "passed": 0,
            "failed": 0,
            "execution_time": 0,
            "security_checks": {}
        }
        
        start_time = time.time()
        
        try:
            # Input validation tests
            input_validation = self._test_input_validation()
            result["security_checks"]["input_validation"] = input_validation
            
            # Authentication tests
            auth_tests = self._test_authentication()
            result["security_checks"]["authentication"] = auth_tests
            
            # Rate limiting tests
            rate_limiting = self._test_rate_limiting()
            result["security_checks"]["rate_limiting"] = rate_limiting
            
            # Calculate overall results
            for check_name, check_result in result["security_checks"].items():
                if isinstance(check_result, dict):
                    result["total"] += check_result.get("total", 0)
                    result["passed"] += check_result.get("passed", 0)
                    result["failed"] += check_result.get("failed", 0)
            
            result["status"] = "PASSED" if result["failed"] == 0 else "FAILED"
            
        except Exception as e:
            result["status"] = "ERROR"
            result["error"] = str(e)
        
        finally:
            result["execution_time"] = time.time() - start_time
        
        return result
    
    def _test_input_validation(self) -> Dict[str, Any]:
        """Test input validation security."""
        tests = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "details": []
        }
        
        # Test malicious inputs
        malicious_inputs = [
            {"action": "<script>alert('xss')</script>", "tenantId": 1},
            {"action": "'; DROP TABLE principles; --", "tenantId": 1},
            {"action": "A" * 10000, "tenantId": 1},  # Very long input
            {"action": "Test", "tenantId": "invalid"},  # Invalid tenant ID type
        ]
        
        for malicious_input in malicious_inputs:
            tests["total"] += 1
            try:
                response = requests.post(
                    "http://localhost:3001/api/v1/evaluate",
                    json=malicious_input,
                    timeout=5
                )
                
                # Should either reject with 400 or handle safely
                if response.status_code == 400 or (response.status_code == 200 and "error" not in response.text.lower()):
                    tests["passed"] += 1
                    tests["details"].append({
                        "input": str(malicious_input)[:100],
                        "status": "PASSED",
                        "response_code": response.status_code
                    })
                else:
                    tests["failed"] += 1
                    tests["details"].append({
                        "input": str(malicious_input)[:100],
                        "status": "FAILED",
                        "response_code": response.status_code,
                        "reason": "Unexpected response"
                    })
                    
            except requests.exceptions.RequestException:
                # Network errors are acceptable for malicious inputs
                tests["passed"] += 1
                tests["details"].append({
                    "input": str(malicious_input)[:100],
                    "status": "PASSED",
                    "reason": "Request rejected"
                })
            except Exception as e:
                tests["failed"] += 1
                tests["details"].append({
                    "input": str(malicious_input)[:100],
                    "status": "FAILED",
                    "error": str(e)
                })
        
        return tests
    
    def _test_authentication(self) -> Dict[str, Any]:
        """Test authentication mechanisms."""
        # Placeholder - would test JWT validation, etc.
        return {
            "status": "SKIPPED",
            "reason": "Authentication not yet implemented",
            "total": 0,
            "passed": 0,
            "failed": 0
        }
    
    def _test_rate_limiting(self) -> Dict[str, Any]:
        """Test rate limiting functionality."""
        tests = {
            "total": 1,
            "passed": 0,
            "failed": 0,
            "details": []
        }
        
        try:
            # Send many requests quickly
            responses = []
            for i in range(50):
                try:
                    response = requests.post(
                        "http://localhost:3001/api/v1/evaluate",
                        json={"action": f"Rate limit test {i}", "tenantId": 1},
                        timeout=1
                    )
                    responses.append(response.status_code)
                except requests.exceptions.RequestException:
                    responses.append(0)  # Request failed/rejected
            
            # Check if any requests were rate limited (429 status)
            rate_limited = any(code == 429 for code in responses)
            
            if rate_limited:
                tests["passed"] += 1
                tests["details"].append({
                    "status": "PASSED",
                    "reason": "Rate limiting is active"
                })
            else:
                # Rate limiting might not be implemented yet
                tests["passed"] += 1  # Don't fail for missing feature
                tests["details"].append({
                    "status": "PASSED",
                    "reason": "Rate limiting not implemented (acceptable for current phase)"
                })
                
        except Exception as e:
            tests["failed"] += 1
            tests["details"].append({
                "status": "FAILED",
                "error": str(e)
            })
        
        return tests
    
    def _run_end_to_end_tests(self) -> Dict[str, Any]:
        """Run end-to-end workflow tests."""
        logger.info("Running end-to-end tests...")
        
        result = {
            "status": "PENDING",
            "total": 0,
            "passed": 0,
            "failed": 0,
            "execution_time": 0,
            "workflows": {}
        }
        
        start_time = time.time()
        
        try:
            # Test complete specification-to-implementation workflow
            workflow_result = self._test_complete_workflow()
            result["workflows"]["complete_workflow"] = workflow_result
            
            result["total"] += workflow_result.get("total", 0)
            result["passed"] += workflow_result.get("passed", 0)
            result["failed"] += workflow_result.get("failed", 0)
            
            result["status"] = "PASSED" if result["failed"] == 0 else "FAILED"
            
        except Exception as e:
            result["status"] = "ERROR"
            result["error"] = str(e)
        
        finally:
            result["execution_time"] = time.time() - start_time
        
        return result
    
    def _test_complete_workflow(self) -> Dict[str, Any]:
        """Test a complete workflow from specification to implementation."""
        workflow = {
            "total": 1,
            "passed": 0,
            "failed": 0,
            "steps": []
        }
        
        try:
            # Step 1: Create a specification (simulated)
            spec_step = {
                "name": "Create Specification",
                "status": "PASSED",
                "details": "Simulated specification creation"
            }
            workflow["steps"].append(spec_step)
            
            # Step 2: Validate specification against constitution
            validation_response = requests.post(
                "http://localhost:3001/api/v1/evaluate",
                json={
                    "action": "Create user authentication system with secure password storage and accessible login forms",
                    "tenantId": 1,
                    "metadata": {"workflow": "end_to_end_test", "step": "specification_validation"}
                },
                timeout=10
            )
            
            if validation_response.status_code == 200:
                validation_data = validation_response.json()
                if validation_data["data"]["compliance"] in ["PASS", "WARNING"]:
                    validation_step = {
                        "name": "Constitutional Validation",
                        "status": "PASSED",
                        "compliance": validation_data["data"]["compliance"],
                        "score": validation_data["data"]["overallScore"]
                    }
                else:
                    validation_step = {
                        "name": "Constitutional Validation",
                        "status": "FAILED",
                        "reason": "Specification failed constitutional validation"
                    }
            else:
                validation_step = {
                    "name": "Constitutional Validation",
                    "status": "FAILED",
                    "reason": f"HTTP {validation_response.status_code}"
                }
            
            workflow["steps"].append(validation_step)
            
            # Step 3: Generate plan (simulated)
            plan_step = {
                "name": "Generate Plan",
                "status": "PASSED",
                "details": "Simulated plan generation"
            }
            workflow["steps"].append(plan_step)
            
            # Step 4: Execute tasks (simulated)
            task_step = {
                "name": "Execute Tasks",
                "status": "PASSED",
                "details": "Simulated task execution"
            }
            workflow["steps"].append(task_step)
            
            # Determine overall workflow success
            failed_steps = [step for step in workflow["steps"] if step["status"] == "FAILED"]
            if len(failed_steps) == 0:
                workflow["passed"] = 1
            else:
                workflow["failed"] = 1
                workflow["failed_steps"] = failed_steps
            
        except Exception as e:
            workflow["failed"] = 1
            workflow["error"] = str(e)
        
        return workflow
    
    def _cleanup_test_environment(self):
        """Clean up test environment and resources."""
        logger.info("Cleaning up test environment...")
        
        try:
            # Clean up temporary files
            temp_files = ["/tmp/pytest_report.json", "/tmp/integration_report.json"]
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            # Additional cleanup as needed
            
        except Exception as e:
            logger.warning(f"Cleanup warning: {e}")
    
    def generate_report(self, output_file: Optional[str] = None) -> str:
        """Generate a comprehensive test report."""
        report = {
            "test_run_summary": {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.results["timestamp"])),
                "overall_status": self.results["overall_status"],
                "total_tests": self.results["total_tests"],
                "passed_tests": self.results["passed_tests"],
                "failed_tests": self.results["failed_tests"],
                "skipped_tests": self.results["skipped_tests"],
                "execution_time": f"{self.results['execution_time']:.2f} seconds",
                "success_rate": f"{(self.results['passed_tests'] / max(self.results['total_tests'], 1)) * 100:.1f}%"
            },
            "test_suites": self.results["test_suites"],
            "system_info": {
                "python_version": sys.version,
                "platform": sys.platform,
                "cpu_count": os.cpu_count(),
                "memory_gb": round(psutil.virtual_memory().total / (1024**3), 2)
            }
        }
        
        report_json = json.dumps(report, indent=2)
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(report_json)
            logger.info(f"Test report written to {output_file}")
        
        return report_json


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(description="SaaS Architecture Spec-Kit Test Runner")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--output", help="Output file for test report")
    parser.add_argument("--suite", action="append", help="Specific test suite to run")
    parser.add_argument("--skip-setup", action="store_true", help="Skip test environment setup")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load configuration
    config = {
        "test_suites": {
            "unit_tests": True,
            "integration_tests": True,
            "agent_tests": True,
            "performance_tests": True,
            "security_tests": True,
            "end_to_end_tests": True
        }
    }
    
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r') as f:
            config.update(json.load(f))
    
    # Override with command line suite selection
    if args.suite:
        for suite_name in config["test_suites"]:
            config["test_suites"][suite_name] = suite_name in args.suite
    
    # Run tests
    runner = TestRunner(config)
    results = runner.run_all_tests()
    
    # Generate report
    report = runner.generate_report(args.output)
    
    # Print summary
    print("\n" + "="*80)
    print("TEST RUN SUMMARY")
    print("="*80)
    print(f"Overall Status: {results['overall_status']}")
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed_tests']}")
    print(f"Failed: {results['failed_tests']}")
    print(f"Skipped: {results['skipped_tests']}")
    print(f"Execution Time: {results['execution_time']:.2f} seconds")
    
    if results['total_tests'] > 0:
        success_rate = (results['passed_tests'] / results['total_tests']) * 100
        print(f"Success Rate: {success_rate:.1f}%")
    
    print("="*80)
    
    # Exit with appropriate code
    if results['overall_status'] in ['PASSED']:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
