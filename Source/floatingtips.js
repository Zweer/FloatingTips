/*
---
description: Class for creating floating balloon tips that nicely appears when hovering an element.

license: MIT-style

authors:
- Lorenzo Stanco
- Niccolò Olivieri

requires:
- core/1.4.2: '*'

provides: [FloatingTips]

adds (Pierre PINTARIC):
- Adds new positions toporbottom, bottomortop, leftorright, rightorleft

...
*/

var FloatingTips = new Class({

	Implements: [Options, Events],

	options: {
		position: 'top',
		center: true,
		content: 'title',
		html: false,
		balloon: true,
		arrowSize: 6,
		arrowOffset: 6,
		distance: 3,
		motion: 6,
		motionOnShow: true,
		motionOnHide: true,
		showOn: 'mouseenter',
		hideOn: 'mouseleave',
		showDelay: 0,
		hideDelay: 0,
		className: 'floating-tip',
		offset: {x: 0, y: 0},
		fx: { 'duration': 'short' }/*,

		onShow: function(){},
		onHide: function(){}*/
	},

    elements: [],
    boundShow: function(){},
    boundHide: function(){},
    boundToggle: function(){},

	initialize: function(elements, options) {
		this.setOptions(options);
        this.boundShow = function(e) { this.show(e); }.bind(this);
        this.boundHide = function(e) { this.hide(e); }.bind(this);
        this.boundToggle = function(e) { this.toggle(e); }.bind(this);
		if (!['top', 'right', 'bottom', 'left', 'inside', 'toporbottom', 'bottomortop', 'leftorright', 'rightorleft'].contains(this.options.position)) this.options.position = 'top';
		if (elements) {
            this.elements.include(elements);
            this.attach();
        }
		return this;
	},

	attach: function(selector) {
        var selector = selector || null;
		var s = this;
        var elements = (selector === null) ? this.elements.join(',') : selector;
		$$(elements).each(function(e) {
            if(e.retrieve('floatingObject') !== null) { return; }
			evs = { };
            evs[s.options.showOn] = s.boundShow;
            if(s.options.hideOn == null) {
                evs[s.options.showOn] = s.boundToggle;
                document.body.addEvent('click', function(event) {
                    if(e.retrieve('floatingVisible') && event.target && event.target != e && !document.id(event.target).getParents().contains(e.retrieve('floatingtip')))
                        s.hide(e);
                });
            } else
                evs[s.options.hideOn] = s.boundHide;
			e.addEvents(evs);
            e.store('floatingObject', s);
		});
        if (selector !== null) {
            this.elements.include(selector);
        }
		return this;
	},

    detach: function(selector) {
        var selector = selector || null;
        var evs = {};
        var elements = (selector === null) ? this.elements.join(',') : selector;
        if(this.options.showOn == this.options.hideOn || this.options.hideOn == null)
            evs[this.options.showOn] = this.boundToggle;
        else {
            evs[this.options.showOn] = this.boundShow;
            evs[this.options.hideOn] = this.boundHide;
        }
        $$(elements).each(function(e) {
            e.removeEvents(evs);
            e.eliminate('floatingObject');
        });
    },

	show: function(e) {
        if(typeOf(e) == 'event')
            e.preventDefault();
        var element = (('target' in e) && (typeof e.target != 'string')) ? document.id(e.target) : e;
        element.store('floatingVisible', true);
		var old = element.retrieve('floatingtip');
		if (old) if (old.getStyle('opacity') == 1) { clearTimeout(old.retrieve('timeout')); return this; }
		var tip = this._create(element);
		if (tip == null) return this;
		element.store('floatingtip', tip);
		this._animate(tip, 'in');
		this.fireEvent('show', [tip, element]);
		return this;
	},
	
	hide: function(e) {
        if(typeOf(e) == 'event')
            e.preventDefault();
        var element = (('target' in e) && (typeof e.target != 'string')) ? document.id(e.target) : e;
        element.store('floatingVisible', false);
		var tip = element.retrieve('floatingtip');
		if (!tip) {
            if (this.options.position == 'inside') {
                try {
                    element = element.getParent().getParent();
                    tip = element.retrieve('floatingtip');
                } catch (x) { }
                if (!tip) return this;
            } else {
                return this;
            }
        }
		this._animate(tip, 'out');
		this.fireEvent('hide', [tip, element]);
		return this;
	},

    toggle: function(e) {
        if(typeOf(e) == 'event')
            e.preventDefault();
        var element = (('target' in e) && (typeof e.target != 'string')) ? document.id(e.target) : e;
        if(element.retrieve('floatingVisible'))
            return this.hide(e);
        else
            return this.show(e);
    },
	
	_create: function(elem) {
		
		var o = this.options;
		var oc = o.content;
		
		if (oc == 'title') {
			oc = 'floatingtitle';
			if (!elem.get('floatingtitle')) elem.setProperty('floatingtitle', elem.get('title'));
			elem.set('title', '');
		}
		
		var cnt = (typeof(oc) == 'string' ? elem.get(oc) : oc(elem));
		var cwr = new Element('div').addClass(o.className).setStyle('margin', 0);
		var tip = new Element('div').addClass(o.className + '-wrapper').setStyles({ 'margin': 0, 'padding': 0, 'z-index': cwr.getStyle('z-index') }).adopt(cwr);
		
		if (cnt) { 
			if (o.html) cwr.set('html', typeof(cnt) == 'string' ? cnt : cnt.get('html')); 
			else cwr.set('text', cnt); 
		} else { 
			return null;
		}
		
		var body = document.id(document.body);
		tip.setStyles({ 'position': 'absolute', 'opacity': 0, 'top': 0, 'left': 0 }).inject(body);
		
		var tipSz = tip.getSize();
		var trgC = elem.getCoordinates();
		var pos = { x: trgC.left + o.offset.x, y: trgC.top + o.offset.y };
		var opos = 'top';
		switch (o.position) {
			case 'toporbottom':
				if ((pos.y - tipSz.y + o.distance) >= 0) {
					opos = 'top';
				} else {
					opos = 'bottom';
				}
				break;
			case 'bottomortop':
				var frameSize = body.getSize();
				if ((pos.y + trgC.height + o.distance + tipSz.y) <= frameSize.y) {
					opos = 'bottom';
				} else {
					opos = 'top';
				}
				break;
			case 'leftorright':
				if ((pos.x - tipSz.x + o.distance) >= 0) {
					opos = 'left';
				} else {
					opos = 'right';
				}
				break;
			case 'rightorleft':
				var frameSize = body.getSize();
				if ((pos.x + trgC.width + o.distance + tipSz.x) <= frameSize.x) {
					opos = 'right';
				} else {
					opos = 'left';
				}
				break;
			default:
				opos = o.position;
		}

		if (o.balloon && !Browser.ie6) {
			
			var trg = new Element('div').addClass(o.className + '-triangle').setStyles({ 'margin': 0, 'padding': 0 });
			var trgSt = { 'border-color': cwr.getStyle('background-color'), 'border-width': o.arrowSize, 'border-style': 'solid','width': 0, 'height': 0 };
			
			switch (opos) {
				case 'inside': 
				case 'top': trgSt['border-bottom-width'] = 0; break;
				case 'right': trgSt['border-left-width'] = 0; trgSt['float'] = 'left'; cwr.setStyle('margin-left', o.arrowSize); break;
				case 'bottom': trgSt['border-top-width'] = 0; break;
				case 'left': trgSt['border-right-width'] = 0; 
					if (Browser.ie7) { trgSt['position'] = 'absolute'; trgSt['right'] = 0; } else { trgSt['float'] = 'right'; }
					cwr.setStyle('margin-right', o.arrowSize); break;
			}
			
			switch (opos) {
				case 'inside': case 'top': case 'bottom': 
					trgSt['border-left-color'] = trgSt['border-right-color'] = 'transparent';
					trgSt['margin-left'] = o.center ? tip.getSize().x / 2 - o.arrowSize : o.arrowOffset; break;
				case 'left': case 'right': 
					trgSt['border-top-color'] = trgSt['border-bottom-color'] = 'transparent';
					trgSt['margin-top'] = o.center ?  tip.getSize().y / 2 - o.arrowSize : o.arrowOffset; break;
			}
			
			trg.setStyles(trgSt).inject(tip, (opos == 'top' || opos == 'inside') ? 'bottom' : 'top');
			
		}
		
		if (opos == 'inside') {
			tip.setStyles({ 'width': tip.getStyle('width'), 'height': tip.getStyle('height') });
			elem.setStyle('position', 'relative').adopt(tip);
			pos = { x: o.offset.x, y: o.offset.y };
		} else {
			switch (opos) {
				case 'top':     pos.y -= tip.getSize().y + o.distance; break;
				case 'right': 	pos.x += trgC.width + o.distance; break;
				case 'bottom': 	pos.y += trgC.height + o.distance; break;
				case 'left': 	pos.x -= tip.getSize().x + o.distance; break;
			}
		}
		
		if (o.center) {
			switch (opos) {
				case 'top': case 'bottom': pos.x += (trgC.width / 2 - tip.getSize().x / 2); break;
				case 'left': case 'right': pos.y += (trgC.height / 2 - tip.getSize().y / 2); break;
				case 'inside':
					pos.x += (trgC.width / 2 - tip.getSize().x / 2);
					pos.y += (trgC.height / 2 - tip.getSize().y / 2); break;
			}
		}
		
		tip.set('morph', o.fx).store('position', pos);
		tip.setStyles({ 'top': pos.y, 'left': pos.x });
		
		return tip;
		
	}.protect(),
	
	_animate: function(tip, d) {
		
		clearTimeout(tip.retrieve('timeout'));
		tip.store('timeout', (function(t) { 
			
			var o = this.options, din = (d == 'in');
			var m = { 'opacity': din ? 1 : 0 };
			
			if ((o.motionOnShow && din) || (o.motionOnHide && !din)) {
				var pos = t.retrieve('position');
				if (!pos) return;
				switch (o.position) {
					case 'inside': 
					case 'top':		m['top']  = din ? [pos.y - o.motion, pos.y] : pos.y - o.motion; break;
					case 'right': 	m['left'] = din ? [pos.x + o.motion, pos.x] : pos.x + o.motion; break;
					case 'bottom': 	m['top']  = din ? [pos.y + o.motion, pos.y] : pos.y + o.motion; break;
					case 'left': 	m['left'] = din ? [pos.x - o.motion, pos.x] : pos.x - o.motion; break;
				}
			}
			
			t.morph(m);
			if (!din) t.get('morph').chain(function() { this.dispose(); }.bind(t)); 
			
		}).delay((d == 'in') ? this.options.showDelay : this.options.hideDelay, this, tip));
		
		return this;
		
	}.protect()

});

Element.implement({
    floatingTipShow: function() {
        var tip = this.retrieve('floatingObject');
        if(tip)
            tip.show(this);
    },

    floatingTipHide: function() {
        var tip = this.retrieve('floatingObject');
        if(tip)
            tip.hide(this);
    },

    floatingTipToggle: function() {
        var tip = this.retrieve('floatingObject');
        if(tip)
            tip.toggle(this);
    }
});