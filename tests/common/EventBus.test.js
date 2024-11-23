import { EventBus } from '../../src/renderer/js/common/EventBus';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on() and emit()', () => {
    test('should call registered callback when event is emitted', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);
      
      eventBus.emit('test-event', 'test-data');
      
      expect(callback).toHaveBeenCalledWith('test-data');
    });

    test('should call multiple callbacks for the same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      
      eventBus.emit('test-event', 'test-data');
      
      expect(callback1).toHaveBeenCalledWith('test-data');
      expect(callback2).toHaveBeenCalledWith('test-data');
    });

    test('should handle multiple arguments', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);
      
      eventBus.emit('test-event', 'arg1', 'arg2', { key: 'value' });
      
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });
  });

  describe('once()', () => {
    test('should call callback only once', () => {
      const callback = jest.fn();
      eventBus.once('test-event', callback);
      
      eventBus.emit('test-event', 'first');
      eventBus.emit('test-event', 'second');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    test('should remove listener after first emit', () => {
      const callback = jest.fn();
      eventBus.once('test-event', callback);
      
      eventBus.emit('test-event');
      expect(eventBus.hasListeners('test-event')).toBeFalsy();
    });
  });

  describe('off()', () => {
    test('should remove specific callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.off('test-event', callback1);
      
      eventBus.emit('test-event');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should handle removing non-existent callback', () => {
      const callback = jest.fn();
      
      // Should not throw error
      expect(() => {
        eventBus.off('test-event', callback);
      }).not.toThrow();
    });
  });

  describe('removeAllListeners()', () => {
    test('should remove all listeners for specific event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test-event-1', callback1);
      eventBus.on('test-event-2', callback2);
      
      eventBus.removeAllListeners('test-event-1');
      
      eventBus.emit('test-event-1');
      eventBus.emit('test-event-2');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should remove all listeners when no event specified', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test-event-1', callback1);
      eventBus.on('test-event-2', callback2);
      
      eventBus.removeAllListeners();
      
      eventBus.emit('test-event-1');
      eventBus.emit('test-event-2');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount()', () => {
    test('should return correct number of listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.once('test-event', jest.fn());
      
      expect(eventBus.listenerCount('test-event')).toBe(3);
    });

    test('should return 0 for event with no listeners', () => {
      expect(eventBus.listenerCount('non-existent')).toBe(0);
    });
  });

  describe('eventNames()', () => {
    test('should return all registered event names', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.once('event3', jest.fn());
      
      const eventNames = eventBus.eventNames();
      
      expect(eventNames).toHaveLength(3);
      expect(eventNames).toContain('event1');
      expect(eventNames).toContain('event2');
      expect(eventNames).toContain('event3');
    });

    test('should return empty array when no events registered', () => {
      expect(eventBus.eventNames()).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    test('should continue execution if callback throws error', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      
      eventBus.on('test-event', errorCallback);
      eventBus.on('test-event', normalCallback);
      
      // Should not throw
      expect(() => {
        eventBus.emit('test-event');
      }).not.toThrow();
      
      expect(normalCallback).toHaveBeenCalled();
    });

    test('should handle errors in once callbacks', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      
      eventBus.once('test-event', errorCallback);
      eventBus.once('test-event', normalCallback);
      
      // Should not throw
      expect(() => {
        eventBus.emit('test-event');
      }).not.toThrow();
      
      expect(normalCallback).toHaveBeenCalled();
    });
  });
});
