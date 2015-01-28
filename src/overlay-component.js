;(function() {

    // ------------------------------ BEGIN OverlayCapablejsPlumbUIComponent --------------------------------------------

    var _internalLabelOverlayId = "__label",
    // helper to get the index of some overlay
        _getOverlayIndex = function (component, id) {
            var idx = -1;
            for (var i = 0, j = component._jsPlumb.overlays.length; i < j; i++) {
                if (id === component._jsPlumb.overlays[i].id) {
                    idx = i;
                    break;
                }
            }
            return idx;
        },
    // this is a shortcut helper method to let people add a label as
    // overlay.
        _makeLabelOverlay = function (component, params) {

            var _params = {
                    cssClass: params.cssClass,
                    labelStyle: component.labelStyle,
                    id: _internalLabelOverlayId,
                    component: component,
                    _jsPlumb: component._jsPlumb.instance  // TODO not necessary, since the instance can be accessed through the component.
                },
                mergedParams = jsPlumb.extend(_params, params);

            return new jsPlumb.Overlays[component._jsPlumb.instance.getRenderMode()].Label(mergedParams);
        },
        _processOverlay = function (component, o) {
            var _newOverlay = null;
            if (jsPlumbUtil.isArray(o)) {	// this is for the shorthand ["Arrow", { width:50 }] syntax
                // there's also a three arg version:
                // ["Arrow", { width:50 }, {location:0.7}]
                // which merges the 3rd arg into the 2nd.
                var type = o[0],
                // make a copy of the object so as not to mess up anyone else's reference...
                    p = jsPlumb.extend({component: component, _jsPlumb: component._jsPlumb.instance}, o[1]);
                if (o.length == 3) jsPlumb.extend(p, o[2]);
                _newOverlay = new jsPlumb.Overlays[component._jsPlumb.instance.getRenderMode()][type](p);
            } else if (o.constructor == String) {
                _newOverlay = new jsPlumb.Overlays[component._jsPlumb.instance.getRenderMode()][o]({component: component, _jsPlumb: component._jsPlumb.instance});
            } else {
                _newOverlay = o;
            }

            if (_newOverlay.id) component.cacheTypeItem("overlay", _newOverlay, _newOverlay.id);
            component._jsPlumb.overlays.push(_newOverlay);
        };

    jsPlumb.OverlayCapableJsPlumbUIComponent = function (params) {

        jsPlumbUIComponent.apply(this, arguments);
        this._jsPlumb.overlays = [];

        if (params.label) {
            this.labelSpec = {
                label: params.label,
                location: params.labelLocation || this.defaultLabelLocation || 0.5,
                labelStyle: params.labelStyle || this._jsPlumb.instance.Defaults.LabelStyle,
                id:_internalLabelOverlayId
            };
        }

        this.setListenerComponent = function (c) {
            if (this._jsPlumb) {
                for (var i = 0; i < this._jsPlumb.overlays.length; i++)
                    this._jsPlumb.overlays[i].setListenerComponent(c);
            }
        };
    };

    jsPlumbUtil.extend(jsPlumb.OverlayCapableJsPlumbUIComponent, jsPlumbUIComponent, {
        applyType: function (t, doNotRepaint, typeMap) {
            this.removeAllOverlays(doNotRepaint);
            if (t.overlays) {
                for (var i = 0, j = t.overlays.length; i < j; i++) {
                    var c = this.getCachedTypeItem("overlay", t.overlays[i][1].id);
                    if (c != null) {
                        c.reattach(this._jsPlumb.instance);
                        this._jsPlumb.overlays.push(c);
                    }
                    else {
                        this.addOverlay(t.overlays[i], true);
                    }
                }
            }
        },
        setHover: function (hover, ignoreAttachedElements) {
            if (this._jsPlumb && !this._jsPlumb.instance.isConnectionBeingDragged()) {
                for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++) {
                    this._jsPlumb.overlays[i][hover ? "addClass" : "removeClass"](this._jsPlumb.instance.hoverClass);
                }
            }
        },
        addOverlay: function (overlay, doNotRepaint) {
            _processOverlay(this, overlay);
            if (!doNotRepaint) this.repaint();
        },
        getOverlay: function (id) {
            var idx = _getOverlayIndex(this, id);
            return idx >= 0 ? this._jsPlumb.overlays[idx] : null;
        },
        getOverlays: function () {
            return this._jsPlumb.overlays;
        },
        hideOverlay: function (id) {
            var o = this.getOverlay(id);
            if (o) o.hide();
        },
        hideOverlays: function () {
            for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++)
                this._jsPlumb.overlays[i].hide();
        },
        showOverlay: function (id) {
            var o = this.getOverlay(id);
            if (o) o.show();
        },
        showOverlays: function () {
            for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++)
                this._jsPlumb.overlays[i].show();
        },
        removeAllOverlays: function (doNotRepaint) {
            for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++) {
                if (this._jsPlumb.overlays[i].cleanup) this._jsPlumb.overlays[i].cleanup();
            }

            this._jsPlumb.overlays.splice(0, this._jsPlumb.overlays.length);
            this._jsPlumb.overlayPositions = null;
            if (!doNotRepaint)
                this.repaint();
        },
        removeOverlay: function (overlayId) {
            var idx = _getOverlayIndex(this, overlayId);
            if (idx != -1) {
                var o = this._jsPlumb.overlays[idx];
                if (o.cleanup) o.cleanup();
                this._jsPlumb.overlays.splice(idx, 1);
                if (this._jsPlumb.overlayPositions)
                    delete this._jsPlumb.overlayPositions[overlayId];
            }
        },
        removeOverlays: function () {
            for (var i = 0, j = arguments.length; i < j; i++)
                this.removeOverlay(arguments[i]);
        },
        moveParent: function (newParent) {
            if (this.bgCanvas) {
                this.bgCanvas.parentNode.removeChild(this.bgCanvas);
                newParent.appendChild(this.bgCanvas);
            }

            this.canvas.parentNode.removeChild(this.canvas);
            newParent.appendChild(this.canvas);

            for (var i = 0; i < this._jsPlumb.overlays.length; i++) {
                if (this._jsPlumb.overlays[i].isAppendedAtTopLevel) {
                    this._jsPlumb.overlays[i].canvas.parentNode.removeChild(this._jsPlumb.overlays[i].canvas);
                    newParent.appendChild(this._jsPlumb.overlays[i].canvas);
                }
            }
        },
        getLabel: function () {
            var lo = this.getOverlay(_internalLabelOverlayId);
            return lo != null ? lo.getLabel() : null;
        },
        getLabelOverlay: function () {
            return this.getOverlay(_internalLabelOverlayId);
        },
        setLabel: function (l) {
            var lo = this.getOverlay(_internalLabelOverlayId);
            if (!lo) {
                var params = l.constructor == String || l.constructor == Function ? { label: l } : l;
                lo = _makeLabelOverlay(this, params);
                this._jsPlumb.overlays.push(lo);
            }
            else {
                if (l.constructor == String || l.constructor == Function) lo.setLabel(l);
                else {
                    if (l.label) lo.setLabel(l.label);
                    if (l.location) lo.setLocation(l.location);
                }
            }

            if (!this._jsPlumb.instance.isSuspendDrawing())
                this.repaint();
        },
        cleanup: function (force) {
            for (var i = 0; i < this._jsPlumb.overlays.length; i++) {
                this._jsPlumb.overlays[i].cleanup(force);
                this._jsPlumb.overlays[i].destroy(force);
            }
            if (force) {
                this._jsPlumb.overlays.length = 0;
                this._jsPlumb.overlayPositions = null;
            }
        },
        setVisible: function (v) {
            this[v ? "showOverlays" : "hideOverlays"]();
        },
        setAbsoluteOverlayPosition: function (overlay, xy) {
            this._jsPlumb.overlayPositions = this._jsPlumb.overlayPositions || {};
            this._jsPlumb.overlayPositions[overlay.id] = xy;
        },
        getAbsoluteOverlayPosition: function (overlay) {
            return this._jsPlumb.overlayPositions ? this._jsPlumb.overlayPositions[overlay.id] : null;
        }
    });

// ------------------------------ END OverlayCapablejsPlumbUIComponent --------------------------------------------

})();