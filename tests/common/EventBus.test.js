import { EventBus } from '../../src/renderer/js/common/EventBus.js';

describe('EventBus', () => {
    let eventBus;

    beforeEach(() => {
        eventBus = new EventBus();
        jest.clearAllMocks();
        localStorage.clear();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('should create an instance', () => {
        expect(eventBus).toBeInstanceOf(EventBus);
    });

    it('should emit and receive events', () => {
        const handler = jest.fn();
        eventBus.on('test', handler);
        eventBus.emit('test', { data: 'test' });
        expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle multiple handlers for the same event', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        eventBus.on('test', handler1);
        eventBus.on('test', handler2);
        eventBus.emit('test', { data: 'test' });
        expect(handler1).toHaveBeenCalledWith({ data: 'test' });
        expect(handler2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event handlers', () => {
        const handler = jest.fn();
        eventBus.on('test', handler);
        eventBus.off('test', handler);
        eventBus.emit('test', { data: 'test' });
        expect(handler).not.toHaveBeenCalled();
    });

    it('should handle events without data', () => {
        const handler = jest.fn();
        eventBus.on('test', handler);
        eventBus.emit('test');
        expect(handler).toHaveBeenCalledWith(undefined);
    });

    it('should handle events with different data types', () => {
        const handler = jest.fn();
        eventBus.on('test', handler);

        // Test with different data types
        eventBus.emit('test', 'string');
        expect(handler).toHaveBeenCalledWith('string');

        eventBus.emit('test', 123);
        expect(handler).toHaveBeenCalledWith(123);

        eventBus.emit('test', { key: 'value' });
        expect(handler).toHaveBeenCalledWith({ key: 'value' });

        eventBus.emit('test', [1, 2, 3]);
        expect(handler).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should not call handlers after they are removed', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        eventBus.on('test', handler1);
        eventBus.on('test', handler2);

        eventBus.emit('test', 'first');
        expect(handler1).toHaveBeenCalledWith('first');
        expect(handler2).toHaveBeenCalledWith('first');

        eventBus.off('test', handler1);
        eventBus.emit('test', 'second');
        expect(handler1).not.toHaveBeenCalledWith('second');
        expect(handler2).toHaveBeenCalledWith('second');
    });

    it('should handle errors in event handlers', () => {
        const errorHandler = jest.fn();
        const throwingHandler = () => {
            throw new Error('Test error');
        };

        console.error = errorHandler;
        eventBus.on('test', throwingHandler);
        eventBus.emit('test');

        expect(errorHandler).toHaveBeenCalled();
    });

    it('should maintain separate event handlers for different events', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        eventBus.on('event1', handler1);
        eventBus.on('event2', handler2);

        eventBus.emit('event1', 'data1');
        expect(handler1).toHaveBeenCalledWith('data1');
        expect(handler2).not.toHaveBeenCalled();

        eventBus.emit('event2', 'data2');
        expect(handler2).toHaveBeenCalledWith('data2');
        expect(handler1).not.toHaveBeenCalledWith('data2');
    });

    it('should handle removing non-existent handlers', () => {
        const handler = jest.fn();
        // Should not throw when removing a handler that was never added
        expect(() => eventBus.off('test', handler)).not.toThrow();
    });

    it('should handle removing handlers for non-existent events', () => {
        const handler = jest.fn();
        // Should not throw when removing a handler for an event that was never created
        expect(() => eventBus.off('nonexistent', handler)).not.toThrow();
    });
});
