// Canopy VirtualList FFI — scroll control and element measurement
//
// Imported in VirtualList modules via:
//   foreign import javascript "external/virtual-list.js" as VirtualListFFI


// ============================================================================
// RESULT CONSTRUCTORS
// ============================================================================

/**
 * Construct an Ok result.
 * @canopy-type Ok : a -> Result x a
 */
function _VirtualList_ok(a) { return __canopy_debug ? { $: 'Ok', a: a } : { $: 0, a: a }; }

/**
 * Construct an Err result.
 * @canopy-type Err : x -> Result x a
 */
function _VirtualList_err(a) { return __canopy_debug ? { $: 'Err', a: a } : { $: 1, a: a }; }

/**
 * Construct a Just value.
 * @canopy-type Just : a -> Maybe a
 */
function _VirtualList_just(a) { return __canopy_debug ? { $: 'Just', a: a } : { $: 0, a: a }; }

/**
 * Construct a Nothing value.
 * @canopy-type Nothing : Maybe a
 */
var _VirtualList_nothing = __canopy_debug ? { $: 'Nothing' } : { $: 1 };


// ============================================================================
// SCROLL CONTROL
// ============================================================================

/**
 * Scroll an element to a specific position.
 * @canopy-type scrollToPosition : String -> Float -> String -> Task x ()
 */
var _VirtualList_scrollToPosition = F3(function(containerId, offset, behaviorStr) {
    return _Scheduler_binding(function(callback) {
        var node = document.getElementById(containerId);
        if (node) {
            node.scrollTo({
                top: offset,
                behavior: behaviorStr
            });
        }
        callback(_Scheduler_succeed(_Utils_Tuple0));
    });
});


// ============================================================================
// ELEMENT MEASUREMENT
// ============================================================================

/**
 * Measure an element's height by its ID.
 * @canopy-type measureElementHeight : String -> Task x Float
 */
function _VirtualList_measureElementHeight(elementId) {
    return _Scheduler_binding(function(callback) {
        requestAnimationFrame(function() {
            var node = document.getElementById(elementId);
            if (node) {
                var rect = node.getBoundingClientRect();
                callback(_Scheduler_succeed(rect.height));
            } else {
                callback(_Scheduler_succeed(0));
            }
        });
    });
}
