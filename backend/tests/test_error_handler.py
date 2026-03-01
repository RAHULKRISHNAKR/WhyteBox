"""
Tests for Error Handler Utilities

Tests custom exceptions, error formatting, and validation helpers.
"""

import pytest
from utils.error_handler import (
    WhyteBoxError,
    ModelLoadError,
    InferenceError,
    ValidationError,
    FileUploadError,
    ConfigurationError,
    format_error_response,
    handle_errors,
    retry_on_error,
    validate_required_fields,
    validate_file_extension,
    validate_file_size,
    success_response,
    ErrorLogger
)


class TestCustomExceptions:
    """Test custom exception classes"""
    
    def test_whytebox_error_basic(self):
        """Test basic WhyteBoxError"""
        error = WhyteBoxError("Test error")
        assert error.message == "Test error"
        assert error.status_code == 500
        assert error.details == {}
    
    def test_whytebox_error_with_details(self):
        """Test WhyteBoxError with details"""
        details = {'key': 'value'}
        error = WhyteBoxError("Test error", status_code=400, details=details)
        assert error.message == "Test error"
        assert error.status_code == 400
        assert error.details == details
    
    def test_model_load_error(self):
        """Test ModelLoadError"""
        error = ModelLoadError("Failed to load model")
        assert error.message == "Failed to load model"
        assert error.status_code == 400
    
    def test_inference_error(self):
        """Test InferenceError"""
        error = InferenceError("Inference failed")
        assert error.message == "Inference failed"
        assert error.status_code == 500
    
    def test_validation_error(self):
        """Test ValidationError"""
        error = ValidationError("Invalid input")
        assert error.message == "Invalid input"
        assert error.status_code == 400
    
    def test_file_upload_error(self):
        """Test FileUploadError"""
        error = FileUploadError("File too large")
        assert error.message == "File too large"
        assert error.status_code == 400
    
    def test_configuration_error(self):
        """Test ConfigurationError"""
        error = ConfigurationError("Invalid config")
        assert error.message == "Invalid config"
        assert error.status_code == 500


class TestErrorFormatting:
    """Test error response formatting"""
    
    def test_format_whytebox_error(self):
        """Test formatting WhyteBoxError"""
        error = ModelLoadError("Model not found", details={'model': 'vgg16'})
        response, status_code = format_error_response(error)
        
        assert response['success'] is False
        assert response['error']['type'] == 'ModelLoadError'
        assert response['error']['message'] == 'Model not found'
        assert response['error']['details'] == {'model': 'vgg16'}
        assert status_code == 400
    
    def test_format_generic_error(self):
        """Test formatting generic exception"""
        error = ValueError("Invalid value")
        response, status_code = format_error_response(error)
        
        assert response['success'] is False
        assert response['error']['type'] == 'ValueError'
        assert response['error']['message'] == 'Invalid value'
        assert status_code == 500
    
    def test_format_error_with_traceback(self):
        """Test formatting error with traceback"""
        error = RuntimeError("Runtime error")
        response, status_code = format_error_response(error, include_traceback=True)
        
        assert 'traceback' in response['error']
        assert isinstance(response['error']['traceback'], str)


class TestErrorDecorator:
    """Test error handling decorator"""
    
    def test_handle_errors_success(self):
        """Test decorator with successful function"""
        @handle_errors()
        def successful_function():
            return {'result': 'success'}
        
        result = successful_function()
        assert result == {'result': 'success'}
    
    def test_handle_errors_with_exception(self):
        """Test decorator with exception"""
        @handle_errors()
        def failing_function():
            raise ValidationError("Validation failed")
        
        response, status_code = failing_function()
        assert status_code == 400
        assert response.json['success'] is False


class TestRetryDecorator:
    """Test retry decorator"""
    
    def test_retry_success_first_attempt(self):
        """Test retry with immediate success"""
        call_count = [0]
        
        @retry_on_error(max_attempts=3)
        def successful_function():
            call_count[0] += 1
            return "success"
        
        result = successful_function()
        assert result == "success"
        assert call_count[0] == 1
    
    def test_retry_success_after_failures(self):
        """Test retry with success after failures"""
        call_count = [0]
        
        @retry_on_error(max_attempts=3, delay=0.1)
        def eventually_successful():
            call_count[0] += 1
            if call_count[0] < 3:
                raise RuntimeError("Temporary error")
            return "success"
        
        result = eventually_successful()
        assert result == "success"
        assert call_count[0] == 3
    
    def test_retry_max_attempts_exceeded(self):
        """Test retry when max attempts exceeded"""
        call_count = [0]
        
        @retry_on_error(max_attempts=3, delay=0.1)
        def always_failing():
            call_count[0] += 1
            raise RuntimeError("Permanent error")
        
        with pytest.raises(RuntimeError):
            always_failing()
        
        assert call_count[0] == 3


class TestValidationHelpers:
    """Test validation helper functions"""
    
    def test_validate_required_fields_success(self):
        """Test validation with all required fields present"""
        data = {'name': 'test', 'value': 123}
        required = ['name', 'value']
        
        # Should not raise exception
        validate_required_fields(data, required)
    
    def test_validate_required_fields_missing(self):
        """Test validation with missing fields"""
        data = {'name': 'test'}
        required = ['name', 'value', 'type']
        
        with pytest.raises(ValidationError) as exc_info:
            validate_required_fields(data, required)
        
        assert 'Missing required fields' in str(exc_info.value)
        assert 'value' in exc_info.value.details['missing_fields']
        assert 'type' in exc_info.value.details['missing_fields']
    
    def test_validate_file_extension_valid(self):
        """Test file extension validation with valid extension"""
        allowed = {'pth', 'pt', 'h5'}
        
        # Should not raise exception
        validate_file_extension('model.pth', allowed)
        validate_file_extension('model.pt', allowed)
        validate_file_extension('model.h5', allowed)
    
    def test_validate_file_extension_invalid(self):
        """Test file extension validation with invalid extension"""
        allowed = {'pth', 'pt'}
        
        with pytest.raises(FileUploadError) as exc_info:
            validate_file_extension('model.txt', allowed)
        
        assert 'not allowed' in str(exc_info.value)
        assert exc_info.value.details['provided_extension'] == 'txt'
    
    def test_validate_file_extension_no_extension(self):
        """Test file extension validation with no extension"""
        allowed = {'pth'}
        
        with pytest.raises(FileUploadError) as exc_info:
            validate_file_extension('model', allowed)
        
        assert 'no extension' in str(exc_info.value)
    
    def test_validate_file_size_valid(self):
        """Test file size validation with valid size"""
        max_size = 100 * 1024 * 1024  # 100MB
        file_size = 50 * 1024 * 1024   # 50MB
        
        # Should not raise exception
        validate_file_size(file_size, max_size)
    
    def test_validate_file_size_too_large(self):
        """Test file size validation with file too large"""
        max_size = 100 * 1024 * 1024   # 100MB
        file_size = 150 * 1024 * 1024  # 150MB
        
        with pytest.raises(FileUploadError) as exc_info:
            validate_file_size(file_size, max_size)
        
        assert 'too large' in str(exc_info.value)
        assert exc_info.value.details['file_size_mb'] == 150.0
        assert exc_info.value.details['max_size_mb'] == 100.0


class TestSuccessResponse:
    """Test success response helper"""
    
    def test_success_response_basic(self):
        """Test basic success response"""
        data = {'result': 'test'}
        response = success_response(data)
        
        assert response['success'] is True
        assert response['message'] == 'Success'
        assert response['data'] == data
    
    def test_success_response_custom_message(self):
        """Test success response with custom message"""
        data = {'result': 'test'}
        response = success_response(data, message='Operation completed')
        
        assert response['success'] is True
        assert response['message'] == 'Operation completed'
        assert response['data'] == data


class TestErrorLogger:
    """Test error logger"""
    
    def test_log_model_error(self, caplog):
        """Test logging model errors"""
        error = ModelLoadError("Model not found")
        ErrorLogger.log_model_error("vgg16", error)
        
        assert "Model error [vgg16]" in caplog.text
    
    def test_log_inference_error(self, caplog):
        """Test logging inference errors"""
        error = InferenceError("Inference failed")
        ErrorLogger.log_inference_error("resnet50", "cat.jpg", error)
        
        assert "Inference error" in caplog.text
        assert "resnet50" in caplog.text
        assert "cat.jpg" in caplog.text
    
    def test_log_api_error(self, caplog):
        """Test logging API errors"""
        error = RuntimeError("API error")
        ErrorLogger.log_api_error("/api/inference", error)
        
        assert "API error [/api/inference]" in caplog.text
    
    def test_log_validation_error(self, caplog):
        """Test logging validation errors"""
        error = ValidationError("Invalid value")
        ErrorLogger.log_validation_error("model_name", "invalid", error)
        
        assert "Validation error" in caplog.text
        assert "model_name" in caplog.text


@pytest.mark.unit
class TestErrorContext:
    """Test error context manager"""
    
    def test_error_context_success(self, caplog):
        """Test context manager with successful operation"""
        from utils.error_handler import ErrorContext
        
        with ErrorContext("test_operation"):
            pass
        
        assert "Starting operation: test_operation" in caplog.text
        assert "Completed operation: test_operation" in caplog.text
    
    def test_error_context_with_error(self, caplog):
        """Test context manager with error"""
        from utils.error_handler import ErrorContext
        
        with pytest.raises(ValueError):
            with ErrorContext("test_operation"):
                raise ValueError("Test error")
        
        assert "Error in test_operation" in caplog.text
    
    def test_error_context_with_cleanup(self, caplog):
        """Test context manager with cleanup function"""
        from utils.error_handler import ErrorContext
        
        cleanup_called = [False]
        
        def cleanup():
            cleanup_called[0] = True
        
        with pytest.raises(ValueError):
            with ErrorContext("test_operation", cleanup_func=cleanup):
                raise ValueError("Test error")
        
        assert cleanup_called[0] is True

# Made with Bob
