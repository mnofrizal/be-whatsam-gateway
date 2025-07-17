// Proxy Service - Worker communication and request forwarding
import axios from "axios";
import logger from "../utils/logger.js";

/**
 * Proxy Service - Handles communication between Backend and Workers
 * Forwards requests to appropriate workers and handles responses
 */
export class ProxyService {
  constructor() {
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Create session on worker
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {Object} sessionData - Session creation data
   * @returns {Object} Worker response
   */
  async createSessionOnWorker(workerEndpoint, sessionData) {
    try {
      logger.info("Creating session on worker", {
        workerEndpoint,
        sessionId: sessionData.sessionId,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "POST",
        `${workerEndpoint}/api/sessions/start`,
        sessionData
      );

      logger.info("Session created on worker successfully", {
        workerEndpoint,
        sessionId: sessionData.sessionId,
        status: response.data?.status,
        service: "ProxyService",
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to create session on worker", {
        workerEndpoint,
        sessionId: sessionData.sessionId,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker session creation failed: ${error.message}`);
    }
  }

  /**
   * Get session status from worker
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} sessionId - Session ID
   * @returns {Object} Session status
   */
  async getSessionStatus(workerEndpoint, sessionId) {
    try {
      logger.debug("Getting session status from worker", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "GET",
        `${workerEndpoint}/api/sessions/${sessionId}/status`
      );

      return response.data;
    } catch (error) {
      logger.error("Failed to get session status from worker", {
        workerEndpoint,
        sessionId,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker status check failed: ${error.message}`);
    }
  }

  /**
   * Delete session on worker
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} sessionId - Session ID
   * @returns {Object} Deletion result
   */
  async deleteSessionOnWorker(workerEndpoint, sessionId) {
    try {
      logger.info("Deleting session on worker", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "DELETE",
        `${workerEndpoint}/api/sessions/${sessionId}`
      );

      logger.info("Session deleted on worker successfully", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to delete session on worker", {
        workerEndpoint,
        sessionId,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker session deletion failed: ${error.message}`);
    }
  }

  /**
   * Disconnect session on worker (stop connection but keep data)
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} sessionId - Session ID
   * @returns {Object} Disconnect result
   */
  async disconnectSessionOnWorker(workerEndpoint, sessionId) {
    try {
      logger.info("Disconnecting session on worker", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "POST",
        `${workerEndpoint}/api/sessions/${sessionId}/disconnect`
      );

      logger.info("Session disconnected on worker successfully", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to disconnect session on worker", {
        workerEndpoint,
        sessionId,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker session disconnect failed: ${error.message}`);
    }
  }

  /**
   * Logout session on worker (clear all session data)
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} sessionId - Session ID
   * @returns {Object} Logout result
   */
  async logoutSessionOnWorker(workerEndpoint, sessionId) {
    try {
      logger.info("Logging out session on worker", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "POST",
        `${workerEndpoint}/api/sessions/${sessionId}/logout`
      );

      logger.info("Session logged out on worker successfully", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to logout session on worker", {
        workerEndpoint,
        sessionId,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker session logout failed: ${error.message}`);
    }
  }

  /**
   * Send message via worker
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} sessionId - Session ID
   * @param {Object} messageData - Message data
   * @returns {Object} Send result
   */
  async sendMessage(workerEndpoint, sessionId, messageData) {
    try {
      logger.info("Sending message via worker", {
        workerEndpoint,
        sessionId,
        messageType: messageData.type,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "POST",
        `${workerEndpoint}/api/${sessionId}/send`,
        messageData
      );

      logger.info("Message sent via worker successfully", {
        workerEndpoint,
        sessionId,
        messageId: response.data?.messageId,
        service: "ProxyService",
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to send message via worker", {
        workerEndpoint,
        sessionId,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker message sending failed: ${error.message}`);
    }
  }

  /**
   * Manage message via worker (delete, unsend, star, unstar, edit, reaction, read)
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} sessionId - Session ID
   * @param {Object} actionData - Action data containing action type and parameters
   * @returns {Object} Management result
   */
  async manageMessage(workerEndpoint, sessionId, actionData) {
    try {
      logger.info("Managing message via worker", {
        workerEndpoint,
        sessionId,
        action: actionData.action,
        messageId: actionData.messageId,
        service: "ProxyService",
        phone: actionData.phone,
      });

      // Debug logging for payload structure
      logger.debug("Worker message management payload", {
        workerEndpoint,
        sessionId,
        actionData,
        fullUrl: `${workerEndpoint}/api/message/${sessionId}/manage`,
        service: "ProxyService",
      });

      // Send full actionData payload to worker (including messageId in body)
      const response = await this.makeRequest(
        "POST",
        `${workerEndpoint}/api/message/${sessionId}/manage`,
        actionData
      );

      logger.info("Message managed via worker successfully", {
        workerEndpoint,
        sessionId,
        action: actionData.action,
        messageId: actionData.messageId,
        service: "ProxyService",
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to manage message via worker", {
        workerEndpoint,
        sessionId,
        action: actionData.action,
        messageId: actionData.messageId,
        error: error.message,
        responseData: error.response?.data,
        service: "ProxyService",
      });
      throw new Error(`Worker message management failed: ${error.message}`);
    }
  }

  /**
   * Restart session on worker
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} sessionId - Session ID
   * @returns {Object} Restart result
   */
  async restartSession(workerEndpoint, sessionId) {
    try {
      logger.info("Restarting session on worker", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "POST",
        `${workerEndpoint}/api/sessions/${sessionId}/restart`
      );

      logger.info("Session restarted on worker successfully", {
        workerEndpoint,
        sessionId,
        service: "ProxyService",
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to restart session on worker", {
        workerEndpoint,
        sessionId,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker session restart failed: ${error.message}`);
    }
  }

  /**
   * Forward generic request to worker
   * @param {string} workerEndpoint - Worker endpoint URL
   * @param {string} endpoint - Endpoint path
   * @param {Object} data - Request data
   * @param {string} method - HTTP method
   * @returns {Object} Worker response
   */
  async forwardRequest(workerEndpoint, endpoint, data = null, method = "POST") {
    try {
      logger.debug("Forwarding request to worker", {
        workerEndpoint,
        endpoint,
        method,
        service: "ProxyService",
      });

      const url = `${workerEndpoint}${endpoint}`;
      const response = await this.makeRequest(method, url, data);

      return response.data;
    } catch (error) {
      logger.error("Failed to forward request to worker", {
        workerEndpoint,
        endpoint,
        method,
        error: error.message,
        service: "ProxyService",
      });
      throw new Error(`Worker request failed: ${error.message}`);
    }
  }

  /**
   * Broadcast request to all workers
   * @param {Array} workers - Array of worker objects
   * @param {string} endpoint - Endpoint path
   * @param {Object} data - Request data
   * @param {string} method - HTTP method
   * @returns {Array} Results from all workers
   */
  async broadcastToWorkers(workers, endpoint, data = null, method = "POST") {
    try {
      logger.info("Broadcasting request to workers", {
        workerCount: workers.length,
        endpoint,
        method,
        service: "ProxyService",
      });

      const promises = workers.map(async (worker) => {
        try {
          const result = await this.forwardRequest(
            worker.endpoint,
            endpoint,
            data,
            method
          );
          return {
            workerId: worker.id,
            success: true,
            data: result,
          };
        } catch (error) {
          return {
            workerId: worker.id,
            success: false,
            error: error.message,
          };
        }
      });

      const results = await Promise.allSettled(promises);

      const processedResults = results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            workerId: workers[index].id,
            success: false,
            error: result.reason?.message || "Unknown error",
          };
        }
      });

      logger.info("Broadcast completed", {
        workerCount: workers.length,
        successCount: processedResults.filter((r) => r.success).length,
        failureCount: processedResults.filter((r) => !r.success).length,
        service: "ProxyService",
      });

      return processedResults;
    } catch (error) {
      logger.error("Failed to broadcast to workers", {
        workerCount: workers.length,
        endpoint,
        error: error.message,
        service: "ProxyService",
      });
      throw error;
    }
  }

  /**
   * Check worker health
   * @param {string} workerEndpoint - Worker endpoint URL
   * @returns {Object} Health status
   */
  async checkWorkerHealth(workerEndpoint) {
    try {
      logger.debug("Checking worker health", {
        workerEndpoint,
        service: "ProxyService",
      });

      const response = await this.makeRequest(
        "GET",
        `${workerEndpoint}/health`,
        null,
        5000 // Shorter timeout for health checks
      );

      return {
        healthy: true,
        data: response.data,
        responseTime: response.responseTime,
      };
    } catch (error) {
      logger.warn("Worker health check failed", {
        workerEndpoint,
        error: error.message,
        service: "ProxyService",
      });

      return {
        healthy: false,
        error: error.message,
        responseTime: null,
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {number} timeout - Request timeout
   * @returns {Object} Response data
   */
  async makeRequest(method, url, data = null, timeout = this.timeout) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();

        const config = {
          method,
          url,
          timeout,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WORKER_AUTH_TOKEN}`,
          },
        };

        if (method !== "GET" && data) {
          config.data = data;
        }

        const response = await axios(config);
        const responseTime = Date.now() - startTime;

        // Add response time to response object
        response.responseTime = responseTime;

        logger.debug("Worker request successful", {
          method,
          url,
          attempt,
          responseTime,
          status: response.status,
          service: "ProxyService",
        });

        return response;
      } catch (error) {
        lastError = error;

        logger.warn("Worker request failed", {
          method,
          url,
          attempt,
          maxAttempts: this.retryAttempts,
          error: error.message,
          status: error.response?.status,
          service: "ProxyService",
        });

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All attempts failed
    const errorMessage = lastError.response?.data?.error || lastError.message;
    const statusCode = lastError.response?.status;

    throw new Error(
      `Request failed after ${this.retryAttempts} attempts: ${errorMessage}${
        statusCode ? ` (HTTP ${statusCode})` : ""
      }`
    );
  }

  /**
   * Delay helper for retry logic
   * @param {number} ms - Milliseconds to delay
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate worker endpoint URL
   * @param {string} endpoint - Worker endpoint
   * @returns {boolean} Is valid
   */
  isValidWorkerEndpoint(endpoint) {
    try {
      const url = new URL(endpoint);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Get worker endpoint with fallback
   * @param {string} primaryEndpoint - Primary endpoint
   * @param {string} fallbackEndpoint - Fallback endpoint
   * @returns {string} Valid endpoint
   */
  getWorkerEndpoint(primaryEndpoint, fallbackEndpoint = null) {
    if (this.isValidWorkerEndpoint(primaryEndpoint)) {
      return primaryEndpoint;
    }

    if (fallbackEndpoint && this.isValidWorkerEndpoint(fallbackEndpoint)) {
      logger.warn("Using fallback endpoint", {
        primary: primaryEndpoint,
        fallback: fallbackEndpoint,
        service: "ProxyService",
      });
      return fallbackEndpoint;
    }

    throw new Error("No valid worker endpoint available");
  }
}

// Export default instance
export default new ProxyService();
