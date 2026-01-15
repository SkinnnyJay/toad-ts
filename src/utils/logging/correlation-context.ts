/**
 * Correlation Context
 *
 * Provides request-scoped correlation ID propagation for structured logging.
 * Uses AsyncLocalStorage to maintain context across async operations.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Correlation context stored in AsyncLocalStorage
 */
interface CorrelationContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

/**
 * AsyncLocalStorage for correlation context
 */
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Get current correlation context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

/**
 * Get current request ID
 */
export function getRequestId(): string | undefined {
  return correlationStorage.getStore()?.requestId;
}

/**
 * Run a function with correlation context
 */
export function withCorrelationContext<T>(
  context: Partial<CorrelationContext>,
  fn: () => Promise<T>
): Promise<T> {
  const fullContext: CorrelationContext = {
    correlationId: context.correlationId || randomUUID(),
    requestId: context.requestId || context.correlationId || randomUUID(),
    userId: context.userId,
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
  };

  return correlationStorage.run(fullContext, fn);
}

/**
 * Set correlation ID in current context (if context exists)
 */
export function setCorrelationId(correlationId: string): void {
  const context = correlationStorage.getStore();
  if (context) {
    context.correlationId = correlationId;
  }
}

/**
 * Set request ID in current context (if context exists)
 */
export function setRequestId(requestId: string): void {
  const context = correlationStorage.getStore();
  if (context) {
    context.requestId = requestId;
  }
}

/**
 * Set user ID in current context (if context exists)
 */
export function setUserId(userId: string): void {
  const context = correlationStorage.getStore();
  if (context) {
    context.userId = userId;
  }
}

/**
 * Create a child context with additional fields
 */
export function withChildContext<T>(
  additionalContext: Partial<CorrelationContext>,
  fn: () => Promise<T>
): Promise<T> {
  const parentContext = correlationStorage.getStore();
  if (!parentContext) {
    // No parent context, create new one
    return withCorrelationContext(additionalContext, fn);
  }

  const childContext: CorrelationContext = {
    ...parentContext,
    ...additionalContext,
    // Preserve correlationId and requestId from parent unless explicitly overridden
    correlationId: additionalContext.correlationId ?? parentContext.correlationId,
    requestId: additionalContext.requestId ?? parentContext.requestId,
  };

  return correlationStorage.run(childContext, fn);
}
