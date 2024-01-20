import { MythixUIComponent } from '@cdn/mythix-ui-core@1';

const ANCHOR_ALIGNMENT_RE = /((?:\d+(?:\.\d+)?||(?:\.\d+)?)(?:[eE][+-]\d+)?)(\s*[+-]\s*(?:\d+(?:\.\d+)?||(?:\.\d+)?)([eE][+-]\d+)?[a-zA-Z%]+)?/g;

const ANCHOR_ALIGNMENT_PREFIXES     = [ 'anchorX', 'anchorY', 'popoverX', 'popoverY' ];
const ANCHOR_ALIGNMENT_FLIP_HELPERS = {
  'flip-x': (alignment) => {
    alignment.anchorX = (1.0 - alignment.anchorX);
    alignment.anchorXOffset *= -1.0;
    alignment.popoverX = (1.0 - alignment.popoverX);
    alignment.popoverXOffset *= -1.0;

    return alignment;
  },
  'flip-y': (alignment) => {
    alignment.anchorY = (1.0 - alignment.anchorY);
    alignment.anchorYOffset *= -1.0;
    alignment.popoverY = (1.0 - alignment.popoverY);
    alignment.popoverYOffset *= -1.0;

    return alignment;
  },
  'flip-major': (alignment) => { // flip the major axis
    let x = Math.abs(alignment.anchorX - alignment.popoverX);
    let y = Math.abs(alignment.anchorY - alignment.popoverY);

    if (x > y) {
      // flip x
      return ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-x'](alignment);
    } else if (y > x) {
      // flip y
      return ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-y'](alignment);
    } else {
      // flip both
      return ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-y'](
        ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-x'](alignment),
      );
    }
  },
  'flip-minor': (alignment) => { // flip the minor axis
    let x = Math.abs(alignment.anchorX - alignment.popoverX);
    let y = Math.abs(alignment.anchorY - alignment.popoverY);

    if (x < y) {
      // flip x
      return ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-x'](alignment);
    } else if (y < x) {
      // flip y
      return ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-y'](alignment);
    } else {
      // flip both
      return ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-y'](
        ANCHOR_ALIGNMENT_FLIP_HELPERS['flip-x'](alignment),
      );
    }
  },
  'swap': (alignment) => { // swap both axis
    let anchorX         = alignment.anchorX;
    let anchorXOffset   = alignment.anchorXOffset;
    let popoverX        = alignment.popoverX;
    let popoverXOffset  = alignment.popoverXOffset;

    alignment.anchorX = alignment.anchorY;
    alignment.anchorXOffset = alignment.anchorYOffset;
    alignment.popoverX = alignment.popoverY;
    alignment.popoverXOffset = alignment.popoverYOffset;
    alignment.anchorY = anchorX;
    alignment.anchorYOffset = anchorXOffset;
    alignment.popoverY = popoverX;
    alignment.popoverYOffset = popoverXOffset;

    return alignment;
  },
  'center-x': (alignment) => { // center X axis
    alignment.anchorX = 0.5;
    alignment.anchorXOffset = 0;
    alignment.popoverX = 0.5;
    alignment.popoverXOffset = 0;

    return alignment;
  },
  'center-y': (alignment) => { // center Y axis
    alignment.anchorY = 0.5;
    alignment.anchorYOffset = 0;
    alignment.popoverY = 0.5;
    alignment.popoverYOffset = 0;

    return alignment;
  },
};

const ANCHOR_ALIGNMENT_DEFAULT_FLIP_HELPER_TYPES = [
  [ 'flip-major' ],           // try flipping major axis first (horizontal or vertical alignment)
  [ 'flip-minor' ],           // next try flipping the minor axis (the opposite axis from step 1)
  [ 'swap' ],                 // now invert (swap) x and y axies
  [ 'swap', 'flip-major' ],   // lastly invert and then swap
  [ 'center-x', 'center-y' ], // lastly center the two on top each other
];

// Align anchor bottom center with popover top center
const ANCHOR_ALIGNMENT = {
  anchorX:            0.5,
  anchorXOffset:      0.0,
  anchorXOffsetUnit:  '',
  anchorY:            1.0,
  anchorYOffset:      0.0,
  anchorYOffsetUnit:  '',
  popoverX:           0.5,
  popoverXOffset:     0.0,
  popoverXOffsetUnit: '',
  popoverY:           0.0,
  popoverYOffset:     0.0,
  popoverYOffsetUnit: '',
};
/*

mythix-popover defines two attributes that aren't defined
by the Popover API web standard:

1. An "anchor" attribute, that specifies the target (as an id) to position the popover against.
2. An "anchor-alignment" attribute that specifies HOW to position itself against the anchor.
*/

export class MythixUIPopover extends MythixUIComponent {
  static tagName = 'mythix-popover';

  constructor() {
    super();

    Object.defineProperties(this, {
      '_parserAnchorAlignmentCache': {
        writable:     true,
        enumerable:   false,
        configurable: true,
        value:        null,
      },
    });
  }

  get anchor() {
    return this.attr('anchor');
  }

  set anchor(value) {
    this.attr('anchor', value);
  }

  get anchorAlignment() {
    return this.attr('anchor-alignment');
  }

  set anchorAlignment(value) {
    this.attr('anchor-alignment', value);
  }

  get open() {
    return (this.attr('open') != null);
  }

  set open(value) {
    this.attr('open', (value) ? true : null);
  }

  set attr$open([ newValue, oldValue ]) {
    if (oldValue == null && newValue === '')
      this.onOpen();
    else if (oldValue === '' && newValue == null)
      this.onClose();
  }

  onOpen() {
    if (!this.anchor)
      return;

    let anchorElement = document.getElementById(this.anchor);
    if (!anchorElement)
      return;

    if (!this.anchorAlignment)
      return;

    this.updateAnchorAlignment(anchorElement, this.anchorAlignment);
  }

  onClose() {

  }

  isPopoverSupported() {
    return Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');
  }

  mounted() {
    super.mounted();

    if (this.isPopoverSupported())
      this.popover = 'manual';
  }

  createShadowDOM() {
  }

  parseAnchorAlignment(_alignmentStr, _options) {
    let options       = _options || {};
    let alignmentStr  = (_alignmentStr || '').trim();

    if (this._parserAnchorAlignmentCache) {
      let {
        alignmentInput,
        clamp,
        result,
      } = this._parserAnchorAlignmentCache;

      if (alignmentInput === alignmentStr && clamp === (options.clamp !== false))
        return result;

      this._parserAnchorAlignmentCache = null;
    }

    const calculate = (alignmentStr, options) => {
      const applyHelpers = (_alignment, helpersIndex) => {
        let alignment = _alignment;

        (ANCHOR_ALIGNMENT_DEFAULT_FLIP_HELPER_TYPES[helpersIndex] || []).forEach((type) => {
          let helper = ANCHOR_ALIGNMENT_FLIP_HELPERS[type];
          alignment = helper(alignment);
        });

        return alignment;
      };

      const buildAlignment = () => {
        return Object.assign({}, ANCHOR_ALIGNMENT);
      };

      if (!alignmentStr) {
        let result = [ buildAlignment() ];

        for (let i = 0, il = ANCHOR_ALIGNMENT_DEFAULT_FLIP_HELPER_TYPES.length; i < il; i++)
          result.push(applyHelpers(buildAlignment(), i));

        return result;
      }

      let alignments = alignmentStr.split(',').map((part) => part.trim()).filter(Boolean).map((alignmentDirective) => {
        let alignment = buildAlignment();
        let index     = 0;

        alignmentDirective.replace(ANCHOR_ALIGNMENT_RE, (m, _pos, _offset) => {
          if (m.trim().length === 0)
            return '';

          if (index >= ANCHOR_ALIGNMENT_PREFIXES.length)
            return '';


          let pos = parseFloat(_pos.replace(/\s+/g, ''));
          if (!isFinite(pos))
            pos = 0.0;

          let offsetStr = (_offset || '').replace(/\s+/g, '');
          let unit      = '';

          offsetStr.replace(/[a-zA-Z%]+$/, (_unit) => {
            unit = _unit;
          });

          let offset = parseFloat(offsetStr.substring(0, offsetStr.length - unit.length));
          if (!isFinite(offset))
            offset = 0.0;

          // Invalid unit?
          if (offsetStr && !unit && offset !== 0.0) {
            offset = 0.0;
            unit = '';
          }

          if (options.clamp !== false) {
            if (pos < 0.0)
              pos = 0.0;
            else if (pos > 1.0)
              pos = 1.0;
          }

          let prefix = ANCHOR_ALIGNMENT_PREFIXES[index++];
          alignment[`${prefix}`] = pos;
          alignment[`${prefix}Offset`] = offset;
          alignment[`${prefix}OffsetUnit`] = unit;
        });

        return alignment;
      });

      let missingAlignments = [];

      // eslint-disable-next-line no-magic-numbers
      for (let i = 0, il = (ANCHOR_ALIGNMENT_DEFAULT_FLIP_HELPER_TYPES.length + 1) - alignments.length; i < il; i++) {
        let alignment = Object.assign({}, alignments[i % alignments.length]);
        missingAlignments.push(applyHelpers(alignment, alignments.length + (i - 1)));
      }

      return alignments.concat(missingAlignments);
    };

    let result = calculate(alignmentStr, options);

    this._parserAnchorAlignmentCache = {
      alignmentStr,
      clamp: (options.clamp !== false),
      result,
    };

    return result;
  }

  updateAnchorAlignment(anchorElement, anchorAlignment) {
    if (!anchorElement)
      return;

    let alignments  = this.parseAnchorAlignment(anchorAlignment);
    let popoverRect = this.getBoundingClientRect();
    let anchorRect  = anchorElement.getBoundingClientRect();

    const isOutsideViewport = (anchorPoint, popoverPoint) => {
      return false;
    };

    let anchorPoint;
    let popoverPoint;

    for (let i = 0, il = alignments.length; i < il; i++) {
      let alignment = alignments[i];

      anchorPoint = {
        x:            (anchorRect.width * alignment.anchorX) + anchorRect.left,
        y:            (anchorRect.height * alignment.anchorY) + anchorRect.top,
        offsetX:      alignment.anchorXOffset,
        offsetXUnit:  alignment.anchorXOffsetUnit,
        offsetY:      alignment.anchorYOffset,
        offsetYUnit:  alignment.anchorYOffsetUnit,
      };

      popoverPoint = {
        x:            (popoverRect.width * alignment.popoverX),
        y:            (popoverRect.height * alignment.popoverY),
        offsetX:      alignment.popoverXOffset,
        offsetXUnit:  alignment.popoverXOffsetUnit,
        offsetY:      alignment.popoverYOffset,
        offsetYUnit:  alignment.popoverYOffsetUnit,
      };

      if (isOutsideViewport(anchorPoint, popoverPoint))
        continue;

      break;
    }

    // console.log({
    //   alignments,
    //   popoverRect,
    //   anchorRect,
    //   anchorPoint,
    //   popoverPoint,
    // });

    if (!anchorPoint || !popoverPoint)
      return;

    let diffX = anchorPoint.x - popoverPoint.x;
    let diffY = anchorPoint.y - popoverPoint.y;

    this.style.left = `${diffX}px`;
    this.style.top = `${diffY}px`;
  }

  hidePopover() {
    if (typeof super.hidePopover === 'function')
      super.hidePopover();

    this.attr('open', null);
  }

  showPopover() {
    if (typeof super.showPopover === 'function')
      super.showPopover();

    this.attr('open', true);
  }

  togglePopover(force) {
    let isOpen;

    if (typeof super.togglePopover === 'function') {
      isOpen = super.togglePopover(force);

      this.attr('open', (isOpen) ? true : null);
    } else {
      let currentOpenState = (this.attr('open') != null);

      let beforeEvent = new Event('beforetoggle');
      beforeEvent.newState = (currentOpenState) ? 'closed' : 'open';
      beforeEvent.oldState = (currentOpenState) ? 'open' : 'closed';

      this.dispatchEvent(beforeEvent);
      if (beforeEvent.defaultPrevented)
        return isOpen;

      this.attr('open', (!isOpen) ? true : null);

      let toggleEvent = new Event('toggle');
      toggleEvent.newState = (currentOpenState) ? 'closed' : 'open';
      toggleEvent.oldState = (currentOpenState) ? 'open' : 'closed';

      this.dispatchEvent(toggleEvent);
    }

    return isOpen;
  }
}

MythixUIPopover.register();
