// After Effects ScriptUI panel for reusable text animation presets.
// Install in Scripts/ScriptUI Panels, then open it from the Window menu.
(function (thisObj) {
    var TITLE = "Text Motion", TAG = "TM - ", ACCENT = [1, 0.45, 0.1, 1];
    var config = { duration: 1, atCti: true, glow: true };

    function p(group, matchName, fallback) {
        if (!group) return null;
        return group.property(matchName) || (fallback ? group.property(fallback) : null);
    }
    function safeSet(property, value) { try { if (property) property.setValue(value); } catch (e) {} }
    function key(property, time, value) { if (property) property.setValueAtTime(time, value); }
    function ease(property) {
        if (!property) return;
        for (var i = 1; i <= property.numKeys; i++) {
            try {
                var v = property.keyValue(i), dimensions = v instanceof Array ? v.length : 1;
                var easeIn = [], easeOut = [];
                for (var d = 0; d < dimensions; d++) {
                    easeIn.push(new KeyframeEase(0, 70));
                    easeOut.push(new KeyframeEase(0, 70));
                }
                property.setTemporalEaseAtKey(i, easeIn, easeOut);
            } catch (e) {}
        }
    }

    function getSelection() {
        var comp = app.project ? app.project.activeItem : null;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Open a composition first.", TITLE); return null;
        }
        var layers = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            if (p(comp.selectedLayers[i], "ADBE Text Properties")) layers.push(comp.selectedLayers[i]);
        }
        if (!layers.length) {
            alert("Select at least one text layer.", TITLE); return null;
        }
        return { comp: comp, layers: layers };
    }

    function effectNamed(layer, name) {
        var effects = p(layer, "ADBE Effect Parade");
        for (var i = 1; effects && i <= effects.numProperties; i++) {
            if (effects.property(i).name === name) return effects.property(i);
        }
        return null;
    }
    function ensureControls(layer) {
        var effects = p(layer, "ADBE Effect Parade");
        var color = effectNamed(layer, TAG + "Accent Color");
        if (!color && effects.canAddProperty("ADBE Color Control")) {
            color = effects.addProperty("ADBE Color Control");
            color.name = TAG + "Accent Color";
            safeSet(p(color, "ADBE Color Control-0001", "Color"), ACCENT);
        }
        if (config.glow && !effectNamed(layer, TAG + "Glow") && effects.canAddProperty("ADBE Glo2")) {
            var glow = effects.addProperty("ADBE Glo2");
            glow.name = TAG + "Glow";
            safeSet(p(glow, "ADBE Glo2-0003", "Glow Threshold"), 55);
            safeSet(p(glow, "ADBE Glo2-0004", "Glow Radius"), 22);
            safeSet(p(glow, "ADBE Glo2-0005", "Glow Intensity"), 1.2);
        }
    }

    function animatorGroup(layer) { return p(p(layer, "ADBE Text Properties"), "ADBE Text Animators"); }
    function addAnimator(layer, name) {
        var a = animatorGroup(layer).addProperty("ADBE Text Animator");
        a.name = TAG + name; return a;
    }
    function animatorProps(a) { return p(a, "ADBE Text Animator Properties", "Properties"); }
    function selector(a, basedOn, shape, smoothness) {
        var s = p(a, "ADBE Text Selectors", "Selectors").addProperty("ADBE Text Selector");
        var advanced = p(s, "ADBE Text Range Advanced", "Advanced");
        safeSet(p(advanced, "ADBE Text Range Type2", "Based On"), basedOn);
        safeSet(p(advanced, "ADBE Text Range Shape", "Shape"), shape);
        safeSet(p(advanced, "ADBE Text Selector Smoothness", "Smoothness"), smoothness);
        safeSet(p(s, "ADBE Text Percent Start", "Start"), 0);
        safeSet(p(s, "ADBE Text Percent End", "End"), 100);
        return s;
    }
    function reveal(a, basedOn, t0, duration, smoothness) {
        var s = selector(a, basedOn, 2, smoothness);
        var offset = p(s, "ADBE Text Percent Offset", "Offset");
        key(offset, t0, -100); key(offset, t0 + duration, 100); ease(offset);
    }
    function full(a) { selector(a, 1, 1, 100); }
    function addOpacity(a, value) {
        var opacity = animatorProps(a).addProperty("ADBE Text Opacity");
        safeSet(opacity, value); return opacity;
    }
    function accent(a) {
        var color = animatorProps(a).addProperty("ADBE Text Fill Color");
        color.expression = 'try { var c=effect("' + TAG + 'Accent Color")("Color"); [c[0],c[1],c[2]]; } catch(e) { [1,0.45,0.1]; }';
    }
    function sourceColor(layer) {
        try {
            var c = p(p(layer, "ADBE Text Properties"), "ADBE Text Document").value.fillColor;
            return [c[0], c[1], c[2]];
        } catch (e) { return [1, 1, 1]; }
    }
    function settle(layer, basedOn, t0, duration, delay, smoothness) {
        var a = addAnimator(layer, "Color Settle");
        var s = selector(a, basedOn, 2, smoothness);
        var offset = p(s, "ADBE Text Percent Offset", "Offset");
        key(offset, t0 + delay, -100); key(offset, t0 + delay + duration, 100); ease(offset);
        safeSet(animatorProps(a).addProperty("ADBE Text Fill Color"), sourceColor(layer));
    }
    function vector(direction, amount) {
        if (direction === "up") return [0, amount, 0];
        if (direction === "down") return [0, -amount, 0];
        if (direction === "right") return [-amount, 0, 0];
        return [amount, 0, 0];
    }
    function position(a, direction, amount) {
        var position = animatorProps(a).addProperty("ADBE Text Position 3D");
        safeSet(position, vector(direction, amount)); return position;
    }

    function buildSweep(layer, t0, duration) {
        var a = addAnimator(layer, "Line Sweep");
        reveal(a, 1, t0, duration, 30); addOpacity(a, 0); accent(a);
        settle(layer, 1, t0, duration * 0.6, duration * 0.2, 30);
    }
    function buildStagger(layer, t0, duration, basedOn, direction) {
        var words = basedOn === 3;
        var a = addAnimator(layer, (words ? "Words " : "Characters ") + direction);
        reveal(a, basedOn, t0, duration, words ? 45 : 25);
        position(a, direction, words ? 70 : 38); addOpacity(a, 0); accent(a);
        settle(layer, basedOn, t0, duration * 0.55, duration * 0.35, words ? 45 : 25);
    }
    function buildBounce(layer, t0, duration, direction) {
        var a = addAnimator(layer, "Bounce " + direction); full(a);
        var pos = animatorProps(a).addProperty("ADBE Text Position 3D");
        key(pos, t0, vector(direction, 130));
        key(pos, t0 + duration * 0.72, vector(direction, -16));
        key(pos, t0 + duration, [0, 0, 0]); ease(pos);
        var opacity = addOpacity(a, 100);
        key(opacity, t0, 0); key(opacity, t0 + duration * 0.3, 100); ease(opacity);
        accent(a); settle(layer, 1, t0, duration * 0.4, duration * 0.65, 40);
    }
    function buildFlicker(layer, t0, duration) {
        var a = addAnimator(layer, "Flicker"); full(a);
        var opacity = addOpacity(a, 100), values = [0, 100, 15, 100, 35, 100, 10, 100, 100];
        for (var i = 0; i < values.length; i++) {
            key(opacity, t0 + duration * i / (values.length - 1), values[i]);
            try { opacity.setInterpolationTypeAtKey(i + 1, KeyframeInterpolationType.HOLD); } catch (e) {}
        }
        accent(a); settle(layer, 1, t0, duration * 0.25, duration, 30);
    }
    function buildFade(layer, t0, duration) {
        var a = addAnimator(layer, "Soft Word Fade");
        reveal(a, 3, t0, duration, 50); addOpacity(a, 0);
        safeSet(animatorProps(a).addProperty("ADBE Text Scale 3D"), [82, 82, 100]);
        accent(a); settle(layer, 3, t0, duration * 0.55, duration * 0.35, 50);
    }

    var PRESETS = [
        ["sweep", "Line Sweep"], ["bounceUp", "Bounce Up"],
        ["bounceRight", "Bounce Right"], ["bounceDown", "Bounce Down"],
        ["wordsUp", "Words Up"], ["wordsRight", "Words Right"],
        ["wordsDown", "Words Down"], ["charsUp", "Characters Up"],
        ["charsRight", "Characters Right"], ["charsDown", "Characters Down"],
        ["flicker", "Flicker"], ["fade", "Soft Word Fade"]
    ];
    function applyPreset(id) {
        var selected = getSelection(); if (!selected) return;
        app.beginUndoGroup("Apply Text Motion");
        try {
            for (var i = 0; i < selected.layers.length; i++) {
                var layer = selected.layers[i];
                var t0 = config.atCti ? selected.comp.time : Math.max(layer.inPoint, layer.startTime);
                ensureControls(layer);
                if (id === "sweep") buildSweep(layer, t0, config.duration);
                else if (id.indexOf("bounce") === 0) buildBounce(layer, t0, config.duration, id.substring(6).toLowerCase());
                else if (id.indexOf("words") === 0) buildStagger(layer, t0, config.duration, 3, id.substring(5).toLowerCase());
                else if (id.indexOf("chars") === 0) buildStagger(layer, t0, config.duration, 1, id.substring(5).toLowerCase());
                else if (id === "flicker") buildFlicker(layer, t0, Math.min(config.duration, 0.8));
                else if (id === "fade") buildFade(layer, t0, config.duration);
            }
        } catch (e) { alert("Could not apply the preset.\n\n" + e.toString(), TITLE); }
        finally { app.endUndoGroup(); }
    }
    function removeGenerated() {
        var selected = getSelection(); if (!selected) return;
        app.beginUndoGroup("Remove Text Motion");
        try {
            for (var i = 0; i < selected.layers.length; i++) {
                var animators = animatorGroup(selected.layers[i]);
                for (var a = animators.numProperties; a >= 1; a--)
                    if (animators.property(a).name.indexOf(TAG) === 0) animators.property(a).remove();
                var effects = p(selected.layers[i], "ADBE Effect Parade");
                for (var e = effects.numProperties; e >= 1; e--)
                    if (effects.property(e).name.indexOf(TAG) === 0) effects.property(e).remove();
            }
        } catch (e) { alert("Could not remove generated items.\n\n" + e.toString(), TITLE); }
        finally { app.endUndoGroup(); }
    }

    function buildUI(host) {
        var win = host instanceof Panel ? host : new Window("palette", TITLE, undefined, { resizeable: true });
        win.orientation = "column"; win.alignChildren = ["fill", "top"];
        win.spacing = 8; win.margins = 12;
        var header = win.add("group"); header.orientation = "column"; header.alignChildren = ["left", "center"];
        var heading = header.add("statictext", undefined, "TEXT MOTION");
        heading.graphics.font = ScriptUI.newFont("dialog", "BOLD", 15);
        header.add("statictext", undefined, "Select text layers and choose an animation.");

        var timing = win.add("panel", undefined, "Timing");
        timing.orientation = "row"; timing.alignChildren = ["left", "center"];
        timing.margins = [10, 16, 10, 8];
        timing.add("statictext", undefined, "Duration");
        var durationInput = timing.add("edittext", undefined, "1.0"); durationInput.characters = 5;
        timing.add("statictext", undefined, "sec");
        var cti = timing.add("checkbox", undefined, "Start at playhead"); cti.value = true;
        var options = win.add("group"); options.orientation = "row";
        var glow = options.add("checkbox", undefined, "Add Glow"); glow.value = true;
        var hint = options.add("statictext", undefined, "Accent color: Effect Controls"); hint.alignment = ["right", "center"];

        var grid = win.add("group"); grid.orientation = "row"; grid.alignChildren = ["fill", "top"]; grid.spacing = 6;
        var left = grid.add("group"), right = grid.add("group");
        left.orientation = right.orientation = "column";
        left.alignChildren = right.alignChildren = ["fill", "top"];
        left.alignment = right.alignment = ["fill", "top"];
        function sync() {
            var value = parseFloat(durationInput.text);
            if (isNaN(value) || value <= 0) { alert("Enter a duration greater than zero.", TITLE); return false; }
            config.duration = Math.max(0.05, value); config.atCti = cti.value; config.glow = glow.value; return true;
        }
        for (var i = 0; i < PRESETS.length; i++) {
            (function (preset, parent) {
                var button = parent.add("button", undefined, preset[1]); button.preferredSize = [150, 30];
                button.onClick = function () { if (sync()) applyPreset(preset[0]); };
            })(PRESETS[i], i % 2 ? right : left);
        }
        var remove = win.add("button", undefined, "Remove Generated Animation");
        remove.preferredSize.height = 30; remove.onClick = removeGenerated;
        win.onResizing = win.onResize = function () { this.layout.resize(); };
        win.layout.layout(true); return win;
    }
    var panel = buildUI(thisObj);
    if (panel instanceof Window) { panel.center(); panel.show(); }
})(this);
