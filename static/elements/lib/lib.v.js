(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var user = window.Polymer || {};
location.search.slice(1).split('&').forEach(function (o) {
o = o.split('=');
o[0] && (user[o[0]] = o[1] || true);
});
var wantShadow = user.dom === 'shadow';
var hasShadow = Boolean(Element.prototype.createShadowRoot);
var nativeShadow = hasShadow && !window.ShadowDOMPolyfill;
var useShadow = wantShadow && hasShadow;
var hasNativeImports = Boolean('import' in document.createElement('link'));
var useNativeImports = hasNativeImports;
var useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
return {
wantShadow: wantShadow,
hasShadow: hasShadow,
nativeShadow: nativeShadow,
useShadow: useShadow,
useNativeShadow: useShadow && nativeShadow,
useNativeImports: useNativeImports,
useNativeCustomElements: useNativeCustomElements
};
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
window.Polymer = Polymer;
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
this._callbacks.forEach(function (cb) {
cb();
});
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
this._doBehavior('registered');
},
createdCallback: function () {
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
attachedCallback: function () {
Polymer.RenderStatus.whenReady(function () {
this.isAttached = true;
this._doBehavior('attached');
}.bind(this));
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', arguments);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
Object.getOwnPropertyNames(api).forEach(function (n) {
this.copyOwnProperty(n, api, prototype);
}, this);
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
var id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDocumentUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDocumentUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
if (doc) {
CustomElements.upgradeAll(doc);
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
this._mixinBehavior(behaviors[i]);
}
return behaviors;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
behaviors.forEach(function (b) {
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}, this);
return flat;
},
_mixinBehavior: function (b) {
Object.getOwnPropertyNames(b).forEach(function (n) {
switch (n) {
case 'hostAttributes':
case 'registered':
case 'properties':
case 'observers':
case 'listeners':
case 'created':
case 'attached':
case 'detached':
case 'attributeChanged':
case 'configure':
case 'ready':
break;
default:
if (!this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
break;
}
}, this);
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
this.behaviors.forEach(function (b) {
this._invokeBehavior(b, name, args);
}, this);
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
this.behaviors.forEach(function (b) {
this._marshalBehavior(b);
}, this);
this._marshalBehavior(this);
}
});
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
this.behaviors.some(function (b) {
return info = this._getPropertyInfo(property, b.properties);
}, this);
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
}
});
Polymer.CaseMap = {
_caseMap: {},
dashToCamelCase: function (dash) {
var mapped = Polymer.CaseMap._caseMap[dash];
if (mapped) {
return mapped;
}
if (dash.indexOf('-') < 0) {
return Polymer.CaseMap._caseMap[dash] = dash;
}
return Polymer.CaseMap._caseMap[dash] = dash.replace(/-([a-z])/g, function (m) {
return m[1].toUpperCase();
});
},
camelToDashCase: function (camel) {
var mapped = Polymer.CaseMap._caseMap[camel];
if (mapped) {
return mapped;
}
return Polymer.CaseMap._caseMap[camel] = camel.replace(/([a-z][A-Z])/g, function (g) {
return g[0] + '-' + g[1].toLowerCase();
});
}
};
Polymer.Base._addFeature({
_prepAttributes: function () {
this._aggregatedAttributes = {};
},
_addHostAttributes: function (attributes) {
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
this._applyAttributes(this, this._aggregatedAttributes);
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
this.serializeValueToAttribute(attr$[n], n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
for (var i = 0, l = this.attributes.length; i < l; i++) {
this._setAttributeToProperty(model, this.attributes[i].name);
}
},
_setAttributeToProperty: function (model, attrName) {
if (!this._serializing) {
var propName = Polymer.CaseMap.dashToCamelCase(attrName);
var info = this.getPropertyInfo(propName);
if (info.defined || this._propertyEffects && this._propertyEffects[propName]) {
var val = this.getAttribute(attrName);
model[propName] = this.deserialize(val, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (name) {
this._serializing = true;
this.serializeValueToAttribute(this[name], Polymer.CaseMap.camelToDashCase(name));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
(node || this)[str === undefined ? 'removeAttribute' : 'setAttribute'](attribute, str);
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value !== null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value;
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return debouncer && debouncer.finish;
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.version = '1.2.1';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
this._template = this._template || Polymer.DomModule.import(this.is, 'template');
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && HTMLTemplateElement.bootstrap) {
HTMLTemplateElement.decorate(this._template);
HTMLTemplateElement.bootstrap(this._template.content);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_pushHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._beginHost();
},
_beginHost: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_popHost: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
this._setupRoot();
this._readyClients();
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
this._finishDistribute();
this._clientsReadied = true;
this._clients = null;
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (var i = 1; i < rowCount; i++) {
for (var j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
var splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
c$ = composed ? node._composedChildren : c$;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
var nativeAppendChild = Element.prototype.appendChild;
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
var DomApi = function (node) {
this.node = node;
if (this.patch) {
this.patch();
}
};
if (window.wrap && Settings.useShadow && !Settings.useNativeShadow) {
DomApi = function (node) {
this.node = wrap(node);
if (this.patch) {
this.patch();
}
};
}
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var wrappedDocument = wrap(document);
while (n && n !== wrappedDocument && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this._addNode(node);
},
insertBefore: function (node, ref_node) {
return this._addNode(node, ref_node);
},
_addNode: function (node, ref_node) {
this._removeNodeFromParent(node);
var addedInsertionPoint;
var root = this.getOwnerRoot();
if (root) {
addedInsertionPoint = this._maybeAddInsertionPoint(node, this.node);
}
if (this._nodeHasLogicalChildren(this.node)) {
if (ref_node) {
var children = this.childNodes;
var index = children.indexOf(ref_node);
if (index < 0) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
}
this._addLogicalInfo(node, this.node, index);
}
this._addNodeToHost(node);
if (!this._maybeDistribute(node, this.node) && !this._tryRemoveUndistributedNode(node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
addToComposedParent(container, node, ref_node);
if (ref_node) {
nativeInsertBefore.call(container, node, ref_node);
} else {
nativeAppendChild.call(container, node);
}
}
if (addedInsertionPoint) {
this._updateInsertionPoints(root.host);
}
this.notifyObserver();
return node;
},
removeChild: function (node) {
if (factory(node).parentNode !== this.node) {
console.warn('The node to be removed is not a child of this node', node);
}
this._removeNodeFromHost(node);
if (!this._maybeDistribute(node, this.node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (container === node.parentNode) {
removeFromComposedParent(container, node);
nativeRemoveChild.call(container, node);
}
}
this.notifyObserver();
return node;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
if (node._ownerShadyRoot === undefined) {
var root;
if (node._isShadyRoot) {
root = node;
} else {
var parent = Polymer.dom(node).parentNode;
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
node._ownerShadyRoot = root;
}
return node._ownerShadyRoot;
},
_maybeDistribute: function (node, parent) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && Polymer.dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && Polymer.dom(fragContent).parentNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this._ownerShadyRootForNode(parent);
if (root) {
var host = root.host;
this._lazyDistribute(host);
}
}
var parentNeedsDist = this._parentNeedsDistribution(parent);
if (parentNeedsDist) {
this._lazyDistribute(parent);
}
return parentNeedsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = factory(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = factory(n).parentNode;
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
saveLightChildrenIfNeeded(parent);
saveLightChildrenIfNeeded(node);
added = true;
}
return added;
},
_tryRemoveUndistributedNode: function (node) {
if (this.node.shadyRoot) {
var parent = getComposedParent(node);
if (parent) {
nativeRemoveChild.call(parent, node);
}
return true;
}
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = factory(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(factory(c).parentNode);
}
},
_nodeHasLogicalChildren: function (node) {
return Boolean(node._lightChildren !== undefined);
},
_parentNeedsDistribution: function (parent) {
return parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot);
},
_removeNodeFromParent: function (node) {
var parent = node._lightParent || node.parentNode;
if (parent && hasDomApi(parent)) {
factory(parent).notifyObserver();
}
this._removeNodeFromHost(node, true);
},
_removeNodeFromHost: function (node, ensureComposedRemoval) {
var hostNeedsDist;
var root;
var parent = node._lightParent;
if (parent) {
factory(node)._distributeParent();
root = this._ownerShadyRootForNode(node);
if (root) {
root.host._elementRemove(node);
hostNeedsDist = this._removeDistributedChildren(root, node);
}
this._removeLogicalInfo(node, parent);
}
this._removeOwnerShadyRoot(node);
if (root && hostNeedsDist) {
this._updateInsertionPoints(root.host);
this._lazyDistribute(root.host);
} else if (ensureComposedRemoval) {
removeFromComposedParent(getComposedParent(node), node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = factory(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = node.parentNode;
if (parent) {
removeFromComposedParent(parent, node);
nativeRemoveChild.call(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = factory(node).parentNode;
}
},
_addNodeToHost: function (node) {
var root = this.getOwnerRoot();
if (root) {
root.host._elementAdd(node);
}
},
_addLogicalInfo: function (node, container, index) {
var children = factory(container).childNodes;
index = index === undefined ? children.length : index;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
children.splice(index++, 0, n);
n._lightParent = container;
}
} else {
children.splice(index, 0, node);
node._lightParent = container;
}
},
_removeLogicalInfo: function (node, container) {
var children = factory(container).childNodes;
var index = children.indexOf(node);
if (index < 0 || container !== node._lightParent) {
throw Error('The node to be removed is not a child of this node');
}
children.splice(index, 1);
node._lightParent = null;
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = factory(node).childNodes;
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = factory(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = factory(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
return this.querySelectorAll(selector)[0];
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return matchesSelector.call(n, selector);
}, this.node);
},
_query: function (matcher, node) {
node = node || this.node;
var list = [];
this._queryElements(factory(node).childNodes, matcher, list);
return list;
},
_queryElements: function (elements, matcher, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
this._queryElement(c, matcher, list);
}
}
},
_queryElement: function (node, matcher, list) {
if (matcher(node)) {
list.push(node);
}
this._queryElements(factory(node).childNodes, matcher, list);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = factory(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._distributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._distributeParent();
},
_distributeParent: function () {
if (this._parentNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = factory(externalNode).childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
}
};
if (!Settings.useShadow) {
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
var c$ = getLightChildren(this.node);
return Array.isArray(c$) ? c$ : Array.prototype.slice.call(c$);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
configurable: true
},
parentNode: {
get: function () {
return this.node._lightParent || getComposedParent(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return this.childNodes[0];
},
configurable: true
},
lastChild: {
get: function () {
var c$ = this.childNodes;
return c$[c$.length - 1];
},
configurable: true
},
nextSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
firstElementChild: {
get: function () {
return this.children[0];
},
configurable: true
},
lastElementChild: {
get: function () {
var c$ = this.children;
return c$[c$.length - 1];
},
configurable: true
},
nextElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = Array.prototype.slice.call(d.childNodes);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.prototype._getComposedInnerHTML = function () {
return getInnerHTML(this.node, true);
};
} else {
var forwardMethods = [
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild'
];
forwardMethods.forEach(function (name) {
DomApi.prototype[name] = function () {
return this.node[name].apply(this.node, arguments);
};
});
DomApi.prototype.querySelectorAll = function (selector) {
return Array.prototype.slice.call(this.node.querySelectorAll(selector));
};
DomApi.prototype.getOwnerRoot = function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
};
DomApi.prototype.importNode = function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
};
DomApi.prototype.getDestinationInsertionPoints = function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype.getDistributedNodes = function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype._distributeParent = function () {
};
var nativeForwards = [
'appendChild',
'insertBefore',
'removeChild',
'replaceChild'
];
nativeForwards.forEach(function (forward) {
DomApi.prototype[forward] = function () {
return this.node[forward].apply(this.node, arguments);
};
});
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
return Array.prototype.slice.call(this.node.childNodes);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.slice.call(this.node.children);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardProperties = [
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
];
forwardProperties.forEach(function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
});
}
var CONTENT = 'content';
function factory(node, patch) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi(node, patch);
}
return node.__domApi;
}
;
function hasDomApi(node) {
return Boolean(node.__domApi);
}
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return factory(obj, patch);
}
};
function getLightChildren(node) {
var children = node._lightChildren;
return children ? children : node.childNodes;
}
function getComposedChildren(node) {
if (!node._composedChildren) {
node._composedChildren = Array.prototype.slice.call(node.childNodes);
}
return node._composedChildren;
}
function addToComposedParent(parent, node, ref_node) {
var children = getComposedChildren(parent);
var i = ref_node ? children.indexOf(ref_node) : -1;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var fragChildren = getComposedChildren(node);
for (var j = 0; j < fragChildren.length; j++) {
addNodeToComposedChildren(fragChildren[j], parent, children, i + j);
}
node._composedChildren = null;
} else {
addNodeToComposedChildren(node, parent, children, i);
}
}
function getComposedParent(node) {
return node.__patched ? node._composedParent : node.parentNode;
}
function addNodeToComposedChildren(node, parent, children, i) {
node._composedParent = parent;
children.splice(i >= 0 ? i : children.length, 0, node);
}
function removeFromComposedParent(parent, node) {
node._composedParent = null;
if (parent) {
var children = getComposedChildren(parent);
var i = children.indexOf(node);
if (i >= 0) {
children.splice(i, 1);
}
}
}
function saveLightChildrenIfNeeded(node) {
if (!node._lightChildren) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
child._lightParent = child._lightParent || node;
}
node._lightChildren = c$;
}
}
function hasInsertionPoint(root) {
return Boolean(root && root._insertionPoints.length);
}
var p = Element.prototype;
var matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return {
getLightChildren: getLightChildren,
getComposedParent: getComposedParent,
getComposedChildren: getComposedChildren,
removeFromComposedParent: removeFromComposedParent,
saveLightChildrenIfNeeded: saveLightChildrenIfNeeded,
matchesSelector: matchesSelector,
hasInsertionPoint: hasInsertionPoint,
ctor: DomApi,
factory: factory,
hasDomApi: hasDomApi
};
}();
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
for (var i = 0; i < this._debouncers.length; i++) {
this._debouncers[i].complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
return this.event.path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var o = this.rootTarget;
while (o) {
path.push(o);
o = Polymer.dom(o).parentNode || o.host;
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
var hasDomApi = Polymer.DomApi.hasDomApi;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function (mxns) {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var h = Polymer.dom(content).observeNodes(this._scheduleNotify.bind(this));
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
var beforeCallListeners = DomApi.EffectiveNodesObserver.prototype._beforeCallListeners;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = this._flush.bind(this);
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
this._observer = Polymer.dom(host).observeNodes(this._scheduleNotify.bind(this));
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var hasDomApi = Polymer.DomApi.hasDomApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_poolContent: function () {
if (this._useContent) {
saveLightChildrenIfNeeded(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLightChildren(this._lightChildren);
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
saveLightChildrenIfNeeded(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
var dom = Polymer.dom(this);
if (updateInsertionPoints) {
dom._updateInsertionPoints(this);
}
var host = getTopDistributingHost(this);
dom._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
this.textContent = '';
this._composedChildren = null;
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = getLightChildren(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = p._lightParent || p.parentNode;
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = getLightChildren(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = getComposedChildren(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (getComposedParent(n) === container) {
remove(n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (var j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
ensureComposedParent(container, children);
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
var saveLightChildrenIfNeeded = Polymer.DomApi.saveLightChildrenIfNeeded;
var getLightChildren = Polymer.DomApi.getLightChildren;
var matchesSelector = Polymer.DomApi.matchesSelector;
var hasInsertionPoint = Polymer.DomApi.hasInsertionPoint;
var getComposedChildren = Polymer.DomApi.getComposedChildren;
var getComposedParent = Polymer.DomApi.getComposedParent;
var removeFromComposedParent = Polymer.DomApi.removeFromComposedParent;
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = content._lightParent;
if (parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
function insertBefore(parentNode, newChild, refChild) {
var newChildParent = getComposedParent(newChild);
if (newChildParent !== parentNode) {
removeFromComposedParent(newChildParent, newChild);
}
remove(newChild);
nativeInsertBefore.call(parentNode, newChild, refChild || null);
newChild._composedParent = parentNode;
}
function remove(node) {
var parentNode = getComposedParent(node);
if (parentNode) {
node._composedParent = null;
nativeRemoveChild.call(parentNode, node);
}
}
function ensureComposedParent(parent, children) {
for (var i = 0, n; i < children.length; i++) {
children[i]._composedParent = parent;
}
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = Polymer.dom(host).children;
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (hasDomApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (hasDomApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLightChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list);
return list;
},
_parseNodeAnnotations: function (node, list) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list);
},
_bindingRegex: /([^{[]*)({{|\[\[)([^}\]]*)(?:]]|}})/g,
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var m, lastIndex;
while ((m = re.exec(text)) !== null) {
if (m[1]) {
parts.push({ literal: m[1] });
}
var mode = m[2][0];
var value = m[3].trim();
var negate = false;
if (value[0] == '!') {
negate = true;
value = value.substring(1).trim();
}
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, callback) {
if (root.firstChild) {
for (var i = 0, node = root.firstChild; node; node = node.nextSibling, i++) {
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = node.nextSibling;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
root.removeChild(n);
n = n.nextSibling;
}
}
var childAnnotation = this._parseNodeAnnotations(node, list, callback);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName == 'input' && name == 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
if (kind === 'property') {
name = Polymer.CaseMap.dashToCamelCase(name);
}
return {
kind: kind,
name: name,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
_localSubTree: function (node, host) {
return node === host ? node.childNodes : node._lightChildren || node.childNodes;
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
return !parent ? root : Polymer.Annotations._localSubTree(parent, root)[annote.index];
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
Polymer.Annotations.prepElement = this._prepElement.bind(this);
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
}
this._processAnnotations(this._notes);
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
p.signature = this._parseMethod(p.value);
if (!p.signature) {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
name: '_parent_' + prop,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
notes.forEach(function (n) {
n.bindings.forEach(function (b) {
b.parts.forEach(function (p) {
if (p.signature) {
var args = p.signature.args;
for (var k = 0; k < args.length; k++) {
pp[args[k].model] = true;
}
} else {
pp[p.model] = true;
}
});
});
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
});
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function (config) {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
this._notes.forEach(function (a) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}, this);
},
_marshalAnnotatedNodes: function () {
if (this._nodes) {
this._nodes = this._nodes.map(function (a) {
return this._findAnnotatedNode(this.root, a);
}, this);
}
},
_marshalAnnotatedListeners: function () {
this._notes.forEach(function (a) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
a.events.forEach(function (e) {
this.listen(node, e.name, e.value);
}, this);
}
}, this);
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, key;
for (key in listeners) {
if (key.indexOf('.') < 0) {
node = this;
name = key;
} else {
name = key.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[key]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = ev.currentTarget;
var gobj = node[GESTURE_KEY];
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend') {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1) {
if (r.reset) {
r.reset();
}
}
}
}
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: function () {
},
upfn: function () {
}
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
var self = this;
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: Gestures.prevent.bind(Gestures)
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: function () {
},
upfn: function () {
},
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
Gestures.prevent('tap');
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
Gestures.prevent('tap');
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
this.boundComplete = this.complete.bind(this);
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryAllDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
var detail = detail === null || detail === undefined ? Polymer.nob : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var event = new CustomEvent(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable,
detail: detail
});
node.dispatchEvent(event);
return event;
},
async: function (callback, waitTime) {
return Polymer.Async.run(callback.bind(this), waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
if (onload) {
l.onload = onload.bind(this);
}
if (onerror) {
l.onerror = onerror.bind(this);
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
prepareModel: function (model) {
model._propertyEffects = {};
model._bindListeners = [];
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (property) {
var eventName = Polymer.CaseMap.camelToDashCase(property) + '-changed';
Polymer.Base.fire(eventName, { value: this[property] }, {
bubbles: false,
node: this
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
effects.forEach(function (fx) {
var fn = Polymer.Bind['_' + fx.kind + 'Effect'];
if (fn) {
fn.call(this, property, value, fx.effect, old, fromAbove);
}
}, this);
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
fx.push({
kind: kind,
effect: effect
});
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'computedAnnotation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event) {
var fn = this._notedListenerFactory(property, path, this._isStructured(path), this._isEventBogus);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, bogusTest) {
return function (e, target) {
if (!bogusTest(e, target)) {
if (e.detail && e.detail.path) {
this._notifyPath(this._fixPath(path, property, e.detail.path), e.detail.value);
} else {
var value = target[property];
if (!isStructured) {
this[path] = target[property];
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
inst._bindListeners.forEach(function (info) {
var node = inst._nodes[info.index];
node.addEventListener(info.event, inst._notifyListener.bind(inst, info.changedFn));
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{' && !effect.parts[0].negate;
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(effect, calc);
}
},
_reflectEffect: function (source) {
this.reflectPropertyToAttribute(source);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var fn = this[effect.method];
if (fn) {
this.__setProperty(effect.name, fn.apply(this, args));
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(effect, computedvalue);
}
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base._get(name, model);
} else {
v = model[name];
}
if (args.length > 1 && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
Polymer.Bind.addPropertyEffect(this, property, kind, effect);
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify');
}
if (prop.reflectToAttribute) {
this._addPropertyEffect(p, 'reflect');
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name
});
}, this);
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
observers.forEach(function (observer) {
this._addComplexObserverEffect(observer);
}, this);
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg
});
}, this);
},
_addAnnotationEffects: function (notes) {
this._nodes = [];
notes.forEach(function (note) {
var index = this._nodes.push(note) - 1;
note.bindings.forEach(function (binding) {
this._addAnnotationEffect(binding, index);
}, this);
}, this);
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
sig.args.forEach(function (arg) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}, this);
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+)\((.*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = {
name: arg,
model: this._modelForPath(arg)
};
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
Polymer.Bind.setupBindListeners(this);
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
return node[property] = value;
}
},
_executeStaticEffects: function () {
if (this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
this._handlers = [];
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
this._config[name] = value;
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
this.behaviors.forEach(function (b) {
this._configureProperties(b.properties, config);
}, this);
this._configureProperties(this.properties, config);
this._mixinConfigure(config, this._aboveConfig);
this._config = config;
this._distributeConfig(this._config);
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_mixinConfigure: function (a, b) {
for (var prop in b) {
if (!this.getPropertyInfo(prop).readOnly) {
a[prop] = b[prop];
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation' && !x.isCompound) {
var node = this._nodes[x.effect.index];
if (node._configValue) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
node._configValue(x.effect.name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!this._clientsReadied) {
this._queueHandler([
fn,
e,
e.target
]);
} else {
return fn.call(this, e, e.target);
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2]);
}
this._handlers = [];
}
});
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
this._get(path, this, info);
this._notifyPath(info.path, value, fromAbove);
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
if (last[0] == '#') {
var key = last;
var old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
var old = prop[last];
var key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects[model];
if (fx$) {
fx$.forEach(function (fx) {
var fxFn = this['_' + fx.kind + 'PathEffect'];
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}, this);
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, { bubbles: false });
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
if (!array.hasOwnProperty('splices')) {
Object.defineProperty(array, 'splices', {
configurable: true,
writable: true
});
}
array.splices = change;
this._notifyPath(path + '.splices', change);
this._notifyPath(path + '.length', array.length);
change.keySplices = null;
change.indexSplices = null;
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start, deleteCount) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
var api = {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, s = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) >= 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^|[\s;])--[^;{]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^|[\s;])?--[^;{]*?:[^{;]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*var[^;]*(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
return api;
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachStyleRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, callback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachStyleRule(this.rulesForStyle(s), callback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
clearStyleRules: function (style) {
style.__cssRules = null;
},
forEachStyleRule: function (node, callback) {
if (!node) {
return;
}
var s = node.parsedSelector;
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
callback(node);
} else if (node.type === this.ruleTypes.KEYFRAMES_RULE || node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachStyleRule(r, callback);
}
}
},
applyCss: function (cssText, moniker, target, afterNode) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
target = target || document.head;
if (!afterNode) {
var n$ = target.querySelectorAll('style[scope]');
afterNode = n$[n$.length - 1];
}
target.insertBefore(style, afterNode && afterNode.nextSibling || target.firstChild);
return style;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this._cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
_cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Array.prototype.slice.call(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this._cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, c + (c ? ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s, text; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)([^\s>+~]+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(\:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?:\:host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /\:\:content|\:\:shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachStyleRule(rules, function (rule) {
var map = self._mapRule(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRule: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || (target.extends = []);
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow && Boolean(this._template);
}
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
if (cssText && this._template) {
var style = styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null);
if (!nativeShadow) {
this._scopeStyle = style;
}
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
node.className = self._scopeElementClass(node, node.className);
var n$ = node.querySelectorAll('*');
Array.prototype.forEach.call(n$, function (n) {
n.className = self._scopeElementClass(n, n.className);
});
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
mxns.forEach(function (m) {
if (m.addedNodes) {
for (var i = 0; i < m.addedNodes.length; i++) {
scopify(m.addedNodes[i]);
}
}
});
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {};
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
});
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
var customCssText = '';
var cssText = rule.parsedCssText;
cssText = cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
var parts = cssText.split(';');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
if (p.match(this.rx.MIXIN_MATCH) || p.match(this.rx.VAR_MATCH)) {
customCssText += p + ';\n';
}
}
return customCssText;
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var pp = p.split(':');
if (pp[1]) {
pp[1] = pp[1].trim();
pp[1] = this.valueForProperty(pp[1], props) || pp[1];
}
p = pp.join(':');
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (rule.cssText && !nativeShadow) {
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, hostSelector + scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.className;
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.className = v;
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,)]*)|(?:[^;]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleUtil = Polymer.StyleUtil;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles ? propertyUtils.decorateStyles(this._styles) : [];
},
customStyle: {},
_setupStyleProperties: function () {
this.customStyle = {};
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = Polymer.dom(node);
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector += (selector ? ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepConstructor();
this._prepTemplate();
this._prepStyles();
this._prepStyleProperties();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._setupConfigure();
this._setupStyleProperties();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalAnnotationReferences();
this._setupDebouncers();
this._marshalInstanceEffects();
this._marshalHostAttributes();
this._marshalBehaviors();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
this._listenListeners(b.listeners);
}
});
(function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply();
} else {
var observer = new MutationObserver(function () {
observer.disconnect();
this._apply();
}.bind(this));
observer.observe(e, { childList: true });
}
}
}
},
_apply: function () {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachStyleRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
this._applyCustomProperties(e);
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function (debouncerExpired) {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (var prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = rootDataHost._prepElement.bind(rootDataHost);
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop)
},
{ kind: 'notify' }
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = this._forwardParentProp.bind(this);
}
this._extendTemplate(template, proto);
template._pathEffector = this._pathEffectorImpl.bind(this);
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
Object.getOwnPropertyNames(proto).forEach(function (n) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
});
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._pushHost(host);
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._popHost();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
key = this._parseKey(key);
this._removeFromMap(this.store[key]);
delete this.store[key];
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key[0] == '#') {
return key.slice(1);
}
throw new Error('unexpected key ' + key);
},
setItem: function (key, item) {
key = this._parseKey(key);
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
},
getItem: function (key) {
key = this._parseKey(key);
return this.store[key];
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key, i;
splices.forEach(function (s) {
s.addedKeys = [];
for (i = 0; i < s.removed.length; i++) {
key = this.getKey(s.removed[i]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (i = 0; i < s.addedCount; i++) {
var item = this.userArray[s.index + i];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}, this);
var removed = [];
var added = [];
for (var key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
},
detached: function () {
for (var i = 0; i < this._instances.length; i++) {
this._detachRow(i);
}
},
attached: function () {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < this._instances.length; i++) {
Polymer.dom(parentNode).insertBefore(this._instances[i].root, this);
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function () {
var dataHost = this._getRootDataHost();
var sort = this.sort;
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function () {
var dataHost = this._getRootDataHost();
var filter = this.filter;
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
var c = this.collection;
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = 0; i < this._instances.length; i++) {
var inst = this._instances[i];
keyToIdx[inst.__key__] = i;
inst.__setProperty(this.indexAs, i, true);
}
this.fire('dom-change');
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
if (this._filterFn) {
keys = keys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
if (this._sortFn) {
keys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
}
for (var i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__setProperty('__key__', key, true);
inst.__setProperty(this.as, c.getItem(key), true);
} else {
this._instances.push(this._insertRow(i, key));
}
}
for (; i < this._instances.length; i++) {
this._detachRow(i);
}
this._instances.splice(keys.length, this._instances.length - keys.length);
},
_keySort: function (a, b) {
return this.collection.getKey(a) - this.collection.getKey(b);
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var instances = this._instances;
var keyMap = {};
var pool = [];
var sortFn = this._sortFn || this._keySort.bind(this);
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var key = s.removed[i];
keyMap[key] = keyMap[key] ? null : -1;
}
for (var i = 0; i < s.added.length; i++) {
var key = s.added[i];
keyMap[key] = keyMap[key] ? null : 1;
}
}, this);
var removedIdxs = [];
var addedKeys = [];
for (var key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (var i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
pool.push(this._detachRow(idx));
instances.splice(idx, 1);
}
}
}
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
addedKeys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
var start = 0;
for (var i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i], pool);
}
}
},
_insertRowUserSort: function (start, key, pool) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
var sortFn = this._sortFn || this._keySort.bind(this);
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._instances.splice(idx, 0, this._insertRow(idx, key, pool));
return idx;
},
_applySplicesArrayOrder: function (splices) {
var pool = [];
var c = this.collection;
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var inst = this._detachRow(s.index + i);
if (!inst.isPlaceholder) {
pool.push(inst);
}
}
this._instances.splice(s.index, s.removed.length);
for (var i = 0; i < s.addedKeys.length; i++) {
var inst = {
isPlaceholder: true,
key: s.addedKeys[i]
};
this._instances.splice(s.index + i, 0, inst);
}
}, this);
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder) {
this._instances[i] = this._insertRow(i, inst.key, pool, true);
}
}
},
_detachRow: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
}
return inst;
},
_insertRow: function (idx, key, pool, replace) {
var inst;
if (inst = pool && pool.pop()) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._generateRow(idx, key);
}
var beforeRow = this._instances[replace ? idx + 1 : idx];
var beforeNode = beforeRow ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
return inst;
},
_generateRow: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
var inst = this.stamp(model);
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
this._instances.forEach(function (inst) {
inst.__setProperty(prop, value, true);
}, this);
},
_forwardParentPath: function (path, value) {
this._instances.forEach(function (inst) {
inst._notifyPath(path, value, true);
}, this);
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
this._teardownInstance();
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
parent.insertBefore(root, this);
}
},
_teardownInstance: function () {
if (this._instance) {
var c = this._instance._children;
if (c) {
var parent = Polymer.dom(Polymer.dom(c[0]).parentNode);
c.forEach(function (n) {
parent.removeChild(n);
});
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
created: function () {
Polymer.RenderStatus.whenReady(this._markImportsReady.bind(this));
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
this._setupConfigure = this._setupConfigure.bind(this, config);
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
Polymer.Base._initFeatures.call(this);
this._children = Array.prototype.slice.call(this.root.childNodes);
}
this._insertChildren();
this.fire('dom-change');
}
});
/**
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronControlState = {

    properties: {

      /**
       * If true, the element currently has focus.
       */
      focused: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true,
        reflectToAttribute: true
      },

      /**
       * If true, the user cannot interact with this element.
       */
      disabled: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_disabledChanged',
        reflectToAttribute: true
      },

      _oldTabIndex: {
        type: Number
      },

      _boundFocusBlurHandler: {
        type: Function,
        value: function() {
          return this._focusBlurHandler.bind(this);
        }
      }

    },

    observers: [
      '_changedControlState(focused, disabled)'
    ],

    ready: function() {
      this.addEventListener('focus', this._boundFocusBlurHandler, true);
      this.addEventListener('blur', this._boundFocusBlurHandler, true);
    },

    _focusBlurHandler: function(event) {
      // NOTE(cdata):  if we are in ShadowDOM land, `event.target` will
      // eventually become `this` due to retargeting; if we are not in
      // ShadowDOM land, `event.target` will eventually become `this` due
      // to the second conditional which fires a synthetic event (that is also
      // handled). In either case, we can disregard `event.path`.

      if (event.target === this) {
        this._setFocused(event.type === 'focus');
      } else if (!this.shadowRoot && !this.isLightDescendant(event.target)) {
        this.fire(event.type, {sourceEvent: event}, {
          node: this,
          bubbles: event.bubbles,
          cancelable: event.cancelable
        });
      }
    },

    _disabledChanged: function(disabled, old) {
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      this.style.pointerEvents = disabled ? 'none' : '';
      if (disabled) {
        this._oldTabIndex = this.tabIndex;
        this.focused = false;
        this.tabIndex = -1;
      } else if (this._oldTabIndex !== undefined) {
        this.tabIndex = this._oldTabIndex;
      }
    },

    _changedControlState: function() {
      // _controlStateChanged is abstract, follow-on behaviors may implement it
      if (this._controlStateChanged) {
        this._controlStateChanged();
      }
    }

  };
/**
   * Use `Polymer.PaperInputBehavior` to implement inputs with `<paper-input-container>`. This
   * behavior is implemented by `<paper-input>`. It exposes a number of properties from
   * `<paper-input-container>` and `<input is="iron-input">` and they should be bound in your
   * template.
   *
   * The input element can be accessed by the `inputElement` property if you need to access
   * properties or methods that are not exposed.
   * @polymerBehavior Polymer.PaperInputBehavior
   */
  Polymer.PaperInputBehaviorImpl = {

    properties: {
      /**
       * Fired when the input changes due to user interaction.
       *
       * @event change
       */

      /**
       * The label for this input. Bind this to `<paper-input-container>`'s `label` property.
       */
      label: {
        type: String
      },

      /**
       * The value for this input. Bind this to the `<input is="iron-input">`'s `bindValue`
       * property, or the value property of your input that is `notify:true`.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to disable this input. Bind this to both the `<paper-input-container>`'s
       * and the input's `disabled` property.
       */
      disabled: {
        type: Boolean,
        value: false
      },

      /**
       * Returns true if the value is invalid. Bind this to both the `<paper-input-container>`'s
       * and the input's `invalid` property.
       */
      invalid: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * Set to true to prevent the user from entering invalid input. Bind this to the
       * `<input is="iron-input">`'s `preventInvalidInput` property.
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Set this to specify the pattern allowed by `preventInvalidInput`. Bind this to the
       * `<input is="iron-input">`'s `allowedPattern` property.
       */
      allowedPattern: {
        type: String
      },

      /**
       * The type of the input. The supported types are `text`, `number` and `password`. Bind this
       * to the `<input is="iron-input">`'s `type` property.
       */
      type: {
        type: String
      },

      /**
       * The datalist of the input (if any). This should match the id of an existing `<datalist>`. Bind this
       * to the `<input is="iron-input">`'s `list` property.
       */
      list: {
        type: String
      },

      /**
       * A pattern to validate the `input` with. Bind this to the `<input is="iron-input">`'s
       * `pattern` property.
       */
      pattern: {
        type: String
      },

      /**
       * Set to true to mark the input as required. Bind this to the `<input is="iron-input">`'s
       * `required` property.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The error message to display when the input is invalid. Bind this to the
       * `<paper-input-error>`'s content, if using.
       */
      errorMessage: {
        type: String
      },

      /**
       * Set to true to show a character counter.
       */
      charCounter: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable the floating label. Bind this to the `<paper-input-container>`'s
       * `noLabelFloat` property.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the label. Bind this to the `<paper-input-container>`'s
       * `alwaysFloatLabel` property.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to auto-validate the input value. Bind this to the `<paper-input-container>`'s
       * `autoValidate` property.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * Name of the validator to use. Bind this to the `<input is="iron-input">`'s `validator`
       * property.
       */
      validator: {
        type: String
      },

      // HTMLInputElement attributes for binding if needed

      /**
       * Bind this to the `<input is="iron-input">`'s `autocomplete` property.
       */
      autocomplete: {
        type: String,
        value: 'off'
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `autofocus` property.
       */
      autofocus: {
        type: Boolean
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `inputmode` property.
       */
      inputmode: {
        type: String
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `minlength` property.
       */
      minlength: {
        type: Number
      },

      /**
       * The maximum length of the input value. Bind this to the `<input is="iron-input">`'s
       * `maxlength` property.
       */
      maxlength: {
        type: Number
      },

      /**
       * The minimum (numeric or date-time) input value.
       * Bind this to the `<input is="iron-input">`'s `min` property.
       */
      min: {
        type: String
      },

      /**
       * The maximum (numeric or date-time) input value.
       * Can be a String (e.g. `"2000-1-1"`) or a Number (e.g. `2`).
       * Bind this to the `<input is="iron-input">`'s `max` property.
       */
      max: {
        type: String
      },

      /**
       * Limits the numeric or date-time increments.
       * Bind this to the `<input is="iron-input">`'s `step` property.
       */
      step: {
        type: String
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `name` property.
       */
      name: {
        type: String
      },

      /**
       * A placeholder string in addition to the label. If this is set, the label will always float.
       */
      placeholder: {
        type: String,
        // need to set a default so _computeAlwaysFloatLabel is run
        value: ''
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `readonly` property.
       */
      readonly: {
        type: Boolean,
        value: false
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `size` property.
       */
      size: {
        type: Number
      },

      // Nonstandard attributes for binding if needed

      /**
       * Bind this to the `<input is="iron-input">`'s `autocapitalize` property.
       */
      autocapitalize: {
        type: String,
        value: 'none'
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `autocorrect` property.
       */
      autocorrect: {
        type: String,
        value: 'off'
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `autosave` property, used with type=search.
       */
      autosave: {
        type: String
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `results` property, , used with type=search.
       */
      results: {
        type: Number
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `accept` property, , used with type=file.
       */
      accept: {
        type: String
      },

      /**
       * Bind this to the `<input is="iron-input">`'s `multiple` property, , used with type=file.
       */
      multiple: {
        type: Boolean
      },

      _ariaDescribedBy: {
        type: String,
        value: ''
      }

    },

    listeners: {
      'addon-attached': '_onAddonAttached'
    },

    observers: [
      '_focusedControlStateChanged(focused)'
    ],

    /**
     * Returns a reference to the input element.
     */
    get inputElement() {
      return this.$.input;
    },

    attached: function() {
      this._updateAriaLabelledBy();
    },

    _appendStringWithSpace: function(str, more) {
      if (str) {
        str = str + ' ' + more;
      } else {
        str = more;
      }
      return str;
    },

    _onAddonAttached: function(event) {
      var target = event.path ? event.path[0] : event.target;
      if (target.id) {
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, target.id);
      } else {
        var id = 'paper-input-add-on-' + Math.floor((Math.random() * 100000));
        target.id = id;
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, id);
      }
    },

    /**
     * Validates the input element and sets an error style if needed.
     *
     * @return {boolean}
     */
    validate: function() {
      return this.inputElement.validate();
    },

    /**
     * If `autoValidate` is true, then validates the element.
     */
    _handleAutoValidate: function() {
      if (this.autoValidate)
        this.validate();
    },

    /**
     * Restores the cursor to its original position after updating the value.
     * @param {string} newValue The value that should be saved.
     */
    updateValueAndPreserveCaret: function(newValue) {
      // Not all elements might have selection, and even if they have the
      // right properties, accessing them might throw an exception (like for
      // <input type=number>)
      try {
        var start = this.inputElement.selectionStart;
        this.value = newValue;

        // The cursor automatically jumps to the end after re-setting the value,
        // so restore it to its original position.
        this.inputElement.selectionStart = start;
        this.inputElement.selectionEnd = start;
      } catch (e) {
        // Just set the value and give up on the caret.
        this.value = newValue;
      }
    },

    _computeAlwaysFloatLabel: function(alwaysFloatLabel, placeholder) {
      return placeholder || alwaysFloatLabel;
    },

    _focusedControlStateChanged: function(focused) {
      // IronControlState stops the focus and blur events in order to redispatch them on the host
      // element, but paper-input-container listens to those events. Since there are more
      // pending work on focus/blur in IronControlState, I'm putting in this hack to get the
      // input focus state working for now.
      if (!this.$.container) {
        this.$.container = Polymer.dom(this.root).querySelector('paper-input-container');
        if (!this.$.container) {
          return;
        }
      }
      if (focused) {
        this.$.container._onFocus();
      } else {
        this.$.container._onBlur();
      }
    },

    _updateAriaLabelledBy: function() {
      var label = Polymer.dom(this.root).querySelector('label');
      if (!label) {
        this._ariaLabelledBy = '';
        return;
      }
      var labelledBy;
      if (label.id) {
        labelledBy = label.id;
      } else {
        labelledBy = 'paper-input-label-' + new Date().getUTCMilliseconds();
        label.id = labelledBy;
      }
      this._ariaLabelledBy = labelledBy;
    },

    _onChange:function(event) {
      // In the Shadow DOM, the `change` event is not leaked into the
      // ancestor tree, so we must do this manually.
      // See https://w3c.github.io/webcomponents/spec/shadow/#events-that-are-not-leaked-into-ancestor-trees.
      if (this.shadowRoot) {
        this.fire(event.type, {sourceEvent: event}, {
          node: this,
          bubbles: event.bubbles,
          cancelable: event.cancelable
        });
      }
    }

  };

  /** @polymerBehavior */
  Polymer.PaperInputBehavior = [Polymer.IronControlState, Polymer.PaperInputBehaviorImpl];
/**
   * Use `Polymer.PaperInputAddonBehavior` to implement an add-on for `<paper-input-container>`. A
   * add-on appears below the input, and may display information based on the input value and
   * validity such as a character counter or an error message.
   * @polymerBehavior
   */
  Polymer.PaperInputAddonBehavior = {

    hostAttributes: {
      'add-on': ''
    },

    attached: function() {
      this.fire('addon-attached');
    },

    /**
     * The function called by `<paper-input-container>` when the input value or validity changes.
     * @param {{
     *   inputElement: (Node|undefined),
     *   value: (string|undefined),
     *   invalid: (boolean|undefined)
     * }} state All properties are optional -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
    }

  };
(function() {

    // monostate data
    var metaDatas = {};
    var metaArrays = {};
    var singleton = null;

    Polymer.IronMeta = Polymer({

      is: 'iron-meta',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * The key used to store `value` under the `type` namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          observer: '_valueChanged'
        },

        /**
         * If true, `value` is set to the iron-meta instance itself.
         */
         self: {
          type: Boolean,
          observer: '_selfChanged'
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      hostAttributes: {
        hidden: true
      },

      /**
       * Only runs if someone invokes the factory/constructor directly
       * e.g. `new Polymer.IronMeta()`
       *
       * @param {{type: (string|undefined), key: (string|undefined), value}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
              case 'value':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key, old) {
        this._resetRegistration(old);
      },

      _valueChanged: function(value) {
        this._resetRegistration(this.key);
      },

      _selfChanged: function(self) {
        if (self) {
          this.value = this;
        }
      },

      _typeChanged: function(type) {
        this._unregisterKey(this.key);
        if (!metaDatas[type]) {
          metaDatas[type] = {};
        }
        this._metaData = metaDatas[type];
        if (!metaArrays[type]) {
          metaArrays[type] = [];
        }
        this.list = metaArrays[type];
        this._registerKeyValue(this.key, this.value);
      },

      /**
       * Retrieves meta data value by key.
       *
       * @method byKey
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      },

      _resetRegistration: function(oldKey) {
        this._unregisterKey(oldKey);
        this._registerKeyValue(this.key, this.value);
      },

      _unregisterKey: function(key) {
        this._unregister(key, this._metaData, this.list);
      },

      _registerKeyValue: function(key, value) {
        this._register(key, value, this._metaData, this.list);
      },

      _register: function(key, value, data, list) {
        if (key && data && value !== undefined) {
          data[key] = value;
          list.push(value);
        }
      },

      _unregister: function(key, data, list) {
        if (key && data) {
          if (key in data) {
            var value = data[key];
            delete data[key];
            this.arrayDelete(list, value);
          }
        }
      }

    });

    Polymer.IronMeta.getIronMeta = function getIronMeta() {
       if (singleton === null) {
         singleton = new Polymer.IronMeta();
       }
       return singleton;
     };

    /**
    `iron-meta-query` can be used to access infomation stored in `iron-meta`.

    Examples:

    If I create an instance like this:

        <iron-meta key="info" value="foo/bar"></iron-meta>

    Note that value="foo/bar" is the metadata I've defined. I could define more
    attributes or use child nodes to define additional metadata.

    Now I can access that element (and it's metadata) from any `iron-meta-query` instance:

         var value = new Polymer.IronMetaQuery({key: 'info'}).value;

    @group Polymer Iron Elements
    @element iron-meta-query
    */
    Polymer.IronMetaQuery = Polymer({

      is: 'iron-meta-query',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * Specifies a key to use for retrieving `value` from the `type`
         * namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          readOnly: true
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      /**
       * Actually a factory method, not a true constructor. Only runs if
       * someone invokes it directly (via `new Polymer.IronMeta()`);
       *
       * @param {{type: (string|undefined), key: (string|undefined)}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key) {
        this._setValue(this._metaData && this._metaData[key]);
      },

      _typeChanged: function(type) {
        this._metaData = metaDatas[type];
        this.list = metaArrays[type];
        if (this.key) {
          this._keyChanged(this.key);
        }
      },

      /**
       * Retrieves meta data value by key.
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      }

    });

  })();
/**
   * `Use Polymer.IronValidatableBehavior` to implement an element that validates user input.
   * Use the related `Polymer.IronValidatorBehavior` to add custom validation logic to an iron-input.
   *
   * By default, an `<iron-form>` element validates its fields when the user presses the submit button.
   * To validate a form imperatively, call the form's `validate()` method, which in turn will
   * call `validate()` on all its children. By using `Polymer.IronValidatableBehavior`, your
   * custom element will get a public `validate()`, which
   * will return the validity of the element, and a corresponding `invalid` attribute,
   * which can be used for styling.
   *
   * To implement the custom validation logic of your element, you must override
   * the protected `_getValidity()` method of this behaviour, rather than `validate()`.
   * See [this](https://github.com/PolymerElements/iron-form/blob/master/demo/simple-element.html)
   * for an example.
   *
   * ### Accessibility
   *
   * Changing the `invalid` property, either manually or by calling `validate()` will update the
   * `aria-invalid` attribute.
   *
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronValidatableBehavior = {

    properties: {

      /**
       * Namespace for this validator.
       */
      validatorType: {
        type: String,
        value: 'validator'
      },

      /**
       * Name of the validator to use.
       */
      validator: {
        type: String
      },

      /**
       * True if the last call to `validate` is invalid.
       */
      invalid: {
        notify: true,
        reflectToAttribute: true,
        type: Boolean,
        value: false
      },

      _validatorMeta: {
        type: Object
      }

    },

    observers: [
      '_invalidChanged(invalid)'
    ],

    get _validator() {
      return this._validatorMeta && this._validatorMeta.byKey(this.validator);
    },

    ready: function() {
      this._validatorMeta = new Polymer.IronMeta({type: this.validatorType});
    },

    _invalidChanged: function() {
      if (this.invalid) {
        this.setAttribute('aria-invalid', 'true');
      } else {
        this.removeAttribute('aria-invalid');
      }
    },

    /**
     * @return {boolean} True if the validator `validator` exists.
     */
    hasValidator: function() {
      return this._validator != null;
    },

    /**
     * Returns true if the `value` is valid, and updates `invalid`. If you want
     * your element to have custom validation logic, do not override this method;
     * override `_getValidity(value)` instead.

     * @param {Object} value The value to be validated. By default, it is passed
     * to the validator's `validate()` function, if a validator is set.
     * @return {boolean} True if `value` is valid.
     */
    validate: function(value) {
      this.invalid = !this._getValidity(value);
      return !this.invalid;
    },

    /**
     * Returns true if `value` is valid.  By default, it is passed
     * to the validator's `validate()` function, if a validator is set. You
     * should override this method if you want to implement custom validity
     * logic for your element.
     *
     * @param {Object} value The value to be validated.
     * @return {boolean} True if `value` is valid.
     */

    _getValidity: function(value) {
      if (this.hasValidator()) {
        return this._validator.validate(value);
      }
      return true;
    }
  };
/*
`<iron-input>` adds two-way binding and custom validators using `Polymer.IronValidatorBehavior`
to `<input>`.

### Two-way binding

By default you can only get notified of changes to an `input`'s `value` due to user input:

    <input value="{{myValue::input}}">

`iron-input` adds the `bind-value` property that mirrors the `value` property, and can be used
for two-way data binding. `bind-value` will notify if it is changed either by user input or by script.

    <input is="iron-input" bind-value="{{myValue}}">

### Custom validators

You can use custom validators that implement `Polymer.IronValidatorBehavior` with `<iron-input>`.

    <input is="iron-input" validator="my-custom-validator">

### Stopping invalid input

It may be desirable to only allow users to enter certain characters. You can use the
`prevent-invalid-input` and `allowed-pattern` attributes together to accomplish this. This feature
is separate from validation, and `allowed-pattern` does not affect how the input is validated.

    <!-- only allow characters that match [0-9] -->
    <input is="iron-input" prevent-invalid-input allowed-pattern="[0-9]">

@hero hero.svg
@demo demo/index.html
*/

  Polymer({

    is: 'iron-input',

    extends: 'input',

    behaviors: [
      Polymer.IronValidatableBehavior
    ],

    properties: {

      /**
       * Use this property instead of `value` for two-way data binding.
       */
      bindValue: {
        observer: '_bindValueChanged',
        type: String
      },

      /**
       * Set to true to prevent the user from entering invalid input. The new input characters are
       * matched with `allowedPattern` if it is set, otherwise it will use the `pattern` attribute if
       * set, or the `type` attribute (only supported for `type=number`).
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Regular expression to match valid input characters.
       */
      allowedPattern: {
        type: String
      },

      _previousValidInput: {
        type: String,
        value: ''
      },

      _patternAlreadyChecked: {
        type: Boolean,
        value: false
      }

    },

    listeners: {
      'input': '_onInput',
      'keypress': '_onKeypress'
    },

    get _patternRegExp() {
      var pattern;
      if (this.allowedPattern) {
        pattern = new RegExp(this.allowedPattern);
      } else if (this.pattern) {
        pattern = new RegExp(this.pattern);
      } else {
        switch (this.type) {
          case 'number':
            pattern = /[0-9.,e-]/;
            break;
        }
      }
      return pattern;
    },

    ready: function() {
      this.bindValue = this.value;
    },

    /**
     * @suppress {checkTypes}
     */
    _bindValueChanged: function() {
      if (this.value !== this.bindValue) {
        this.value = !(this.bindValue || this.bindValue === 0) ? '' : this.bindValue;
      }
      // manually notify because we don't want to notify until after setting value
      this.fire('bind-value-changed', {value: this.bindValue});
    },

    _onInput: function() {
      // Need to validate each of the characters pasted if they haven't
      // been validated inside `_onKeypress` already.
      if (this.preventInvalidInput && !this._patternAlreadyChecked) {
        var valid = this._checkPatternValidity();
        if (!valid) {
          this.value = this._previousValidInput;
        }
      }

      this.bindValue = this.value;
      this._previousValidInput = this.value;
      this._patternAlreadyChecked = false;
    },

    _isPrintable: function(event) {
      // What a control/printable character is varies wildly based on the browser.
      // - most control characters (arrows, backspace) do not send a `keypress` event
      //   in Chrome, but the *do* on Firefox
      // - in Firefox, when they do send a `keypress` event, control chars have
      //   a charCode = 0, keyCode = xx (for ex. 40 for down arrow)
      // - printable characters always send a keypress event.
      // - in Firefox, printable chars always have a keyCode = 0. In Chrome, the keyCode
      //   always matches the charCode.
      // None of this makes any sense.

      // For these keys, ASCII code == browser keycode.
      var anyNonPrintable =
        (event.keyCode == 8)   ||  // backspace
        (event.keyCode == 9)   ||  // tab
        (event.keyCode == 13)  ||  // enter
        (event.keyCode == 27);     // escape

      // For these keys, make sure it's a browser keycode and not an ASCII code.
      var mozNonPrintable =
        (event.keyCode == 19)  ||  // pause
        (event.keyCode == 20)  ||  // caps lock
        (event.keyCode == 45)  ||  // insert
        (event.keyCode == 46)  ||  // delete
        (event.keyCode == 144) ||  // num lock
        (event.keyCode == 145) ||  // scroll lock
        (event.keyCode > 32 && event.keyCode < 41)   || // page up/down, end, home, arrows
        (event.keyCode > 111 && event.keyCode < 124); // fn keys

      return !anyNonPrintable && !(event.charCode == 0 && mozNonPrintable);
    },

    _onKeypress: function(event) {
      if (!this.preventInvalidInput && this.type !== 'number') {
        return;
      }
      var regexp = this._patternRegExp;
      if (!regexp) {
        return;
      }

      // Handle special keys and backspace
      if (event.metaKey || event.ctrlKey || event.altKey)
        return;

      // Check the pattern either here or in `_onInput`, but not in both.
      this._patternAlreadyChecked = true;

      var thisChar = String.fromCharCode(event.charCode);
      if (this._isPrintable(event) && !regexp.test(thisChar)) {
        event.preventDefault();
      }
    },

    _checkPatternValidity: function() {
      var regexp = this._patternRegExp;
      if (!regexp) {
        return true;
      }
      for (var i = 0; i < this.value.length; i++) {
        if (!regexp.test(this.value[i])) {
          return false;
        }
      }
      return true;
    },

    /**
     * Returns true if `value` is valid. The validator provided in `validator` will be used first,
     * then any constraints.
     * @return {boolean} True if the value is valid.
     */
    validate: function() {
      // Empty, non-required input is valid.
      if (!this.required && this.value == '') {
        this.invalid = false;
        return true;
      }

      var valid;
      if (this.hasValidator()) {
        valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
      } else {
        this.invalid = !this.validity.valid;
        valid = this.validity.valid;
      }
      this.fire('iron-input-validate');
      return valid;
    }

  });

  /*
  The `iron-input-validate` event is fired whenever `validate()` is called.
  @event iron-input-validate
  */
/**
  Polymer.IronFormElementBehavior enables a custom element to be included
  in an `iron-form`.

  @demo demo/index.html
  @polymerBehavior
  */
  Polymer.IronFormElementBehavior = {

    properties: {
      /**
       * Fired when the element is added to an `iron-form`.
       *
       * @event iron-form-element-register
       */

      /**
       * Fired when the element is removed from an `iron-form`.
       *
       * @event iron-form-element-unregister
       */

      /**
       * The name of this element.
       */
      name: {
        type: String
      },

      /**
       * The value for this element.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to mark the input as required. If used in a form, a
       * custom element that uses this behavior should also use
       * Polymer.IronValidatableBehavior and define a custom validation method.
       * Otherwise, a `required` element will always be considered valid.
       * It's also strongly recommended to provide a visual style for the element
       * when its value is invalid.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The form that the element is registered to.
       */
      _parentForm: {
        type: Object
      }
    },

    attached: function() {
      // Note: the iron-form that this element belongs to will set this
      // element's _parentForm property when handling this event.
      this.fire('iron-form-element-register');
    },

    detached: function() {
      if (this._parentForm) {
        this._parentForm.fire('iron-form-element-unregister', {target: this});
      }
    }

  };
/**
   * Use `Polymer.IronValidatorBehavior` to implement a custom input/form validator. Element
   * instances implementing this behavior will be registered for use in elements that implement
   * `Polymer.IronValidatableBehavior`.
   * 
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronValidatorBehavior = {

    properties: {

      /**
       * Namespace for this validator.
       */
      validatorType: {
        type: String,
        value: 'validator'
      },

      /**
       * Name for this validator, used by `Polymer.IronValidatableBehavior` to lookup this element.
       */
      validatorName: {
        type: String,
        value: function() {
          return this.is;
        }
      }

    },

    ready: function() {
      new Polymer.IronMeta({type: this.validatorType, key: this.validatorName, value: this});
    },

    /**
     * Implement custom validation logic in this function.
     * @param {Object} values The value to validate. May be any type depending on the validation logic.
     * @return {Boolean} true if `values` is valid.
     */
    validate: function(values) {
    }
  };
Polymer({

    is: 'date-validator',

    behaviors: [
      Polymer.IronValidatorBehavior
    ],

    validate: function(date) {
      if (!date)
        return false;

      if (date.month > 12 || date.month < 1)
        return false;

      var then = new Date ('20' + date.year, date.month);
      var now = new Date();
      return (then > now);
    }

  });
/*
jQuery Credit Card Validator 1.0

Copyright 2012-2015 Pawel Decowski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
 */

 (function(global) {
  'use strict';

  function validateCreditCard (input) {
    var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
    var bind, card, card_type, card_types, get_card_type, is_valid_length, is_valid_luhn, normalize, validate, validate_number, _i, _len, _ref;
    card_types = [
      {
        name: 'amex',
        icon: 'images/amex.png',
        pattern: /^3[47]/,
        valid_length: [15]
      }, {
        name: 'diners_club',
        icon: 'images/diners_club.png',
        pattern: /^30[0-5]/,
        valid_length: [14]
      }, {
        name: 'diners_club',
        icon: 'images/diners_club.png',
        pattern: /^36/,
        valid_length: [14]
      }, {
        name: 'jcb',
        icon: 'images/jcb.png',
        pattern: /^35(2[89]|[3-8][0-9])/,
        valid_length: [16]
      }, {
        name: 'laser',
        pattern: /^(6304|670[69]|6771)/,
        valid_length: [16, 17, 18, 19]
      }, {
        name: 'visa_electron',
        pattern: /^(4026|417500|4508|4844|491(3|7))/,
        valid_length: [16]
      }, {
        name: 'visa',
        icon: 'images/visa.png',
        pattern: /^4/,
        valid_length: [16]
      }, {
        name: 'mastercard',
        icon: 'images/mastercard.png',
        pattern: /^5[1-5]/,
        valid_length: [16]
      }, {
        name: 'maestro',
        pattern: /^(5018|5020|5038|6304|6759|676[1-3])/,
        valid_length: [12, 13, 14, 15, 16, 17, 18, 19]
      }, {
        name: 'discover',
        icon: 'images/discover.png',
        pattern: /^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)/,
        valid_length: [16]
      }
    ];

    var options = {};

    if (options.accept == null) {
      options.accept = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = card_types.length; _i < _len; _i++) {
          card = card_types[_i];
          _results.push(card.name);
        }
        return _results;
      })();
    }
    _ref = options.accept;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      card_type = _ref[_i];
      if (__indexOf.call((function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = card_types.length; _j < _len1; _j++) {
          card = card_types[_j];
          _results.push(card.name);
        }
        return _results;
      })(), card_type) < 0) {
        throw "Credit card type '" + card_type + "' is not supported";
      }
    }

    get_card_type = function(number) {
      var _j, _len1, _ref1;
      _ref1 = (function() {
        var _k, _len1, _ref1, _results;
        _results = [];
        for (_k = 0, _len1 = card_types.length; _k < _len1; _k++) {
          card = card_types[_k];
          if (_ref1 = card.name, __indexOf.call(options.accept, _ref1) >= 0) {
            _results.push(card);
          }
        }
        return _results;
      })();
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        card_type = _ref1[_j];
        if (number.match(card_type.pattern)) {
          return card_type;
        }
      }
      return null;
    };

    is_valid_luhn = function(number) {
      var digit, n, sum, _j, _len1, _ref1;
      sum = 0;
      _ref1 = number.split('').reverse();
      for (n = _j = 0, _len1 = _ref1.length; _j < _len1; n = ++_j) {
        digit = _ref1[n];
        digit = +digit;
        if (n % 2) {
          digit *= 2;
          if (digit < 10) {
            sum += digit;
          } else {
            sum += digit - 9;
          }
        } else {
          sum += digit;
        }
      }
      return sum % 10 === 0;
    };

    is_valid_length = function(number, card_type) {
      var _ref1;
      return _ref1 = number.length, __indexOf.call(card_type.valid_length, _ref1) >= 0;
    };

    validate_number = (function(_this) {
      return function(number) {
        var length_valid, luhn_valid;
        card_type = get_card_type(number);
        luhn_valid = false;
        length_valid = false;
        if (card_type != null) {
          luhn_valid = is_valid_luhn(number);
          length_valid = is_valid_length(number, card_type);
        }
        return {
          card_type: card_type,
          valid: luhn_valid && length_valid,
          luhn_valid: luhn_valid,
          length_valid: length_valid
        };
      };
    })(this);

    normalize = function(number) {
      return number.replace(/[ -]/g, '');
    };

    validate = (function(_this) {
      return function() {
        return validate_number(normalize(input));
      };
    })(this);

    return validate(input);
  };

  global.CreditCardValidator = {
    validate: validateCreditCard
  };
 })(this);
Polymer({

    is: 'zip-validator',

    behaviors: [
      Polymer.IronValidatorBehavior
    ],

    validate: function(value) {
      // A valid zipcode is 5 digits or 5 digits, a dash, and 4 more digits.
      var re = /^\d{5}(?:-\d{4})?$/;
      return re.test(value);
    }

  });
(function() {
    'use strict';

    /**
     * Chrome uses an older version of DOM Level 3 Keyboard Events
     *
     * Most keys are labeled as text, but some are Unicode codepoints.
     * Values taken from: http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/keyset.html#KeySet-Set
     */
    var KEY_IDENTIFIER = {
      'U+0009': 'tab',
      'U+001B': 'esc',
      'U+0020': 'space',
      'U+002A': '*',
      'U+0030': '0',
      'U+0031': '1',
      'U+0032': '2',
      'U+0033': '3',
      'U+0034': '4',
      'U+0035': '5',
      'U+0036': '6',
      'U+0037': '7',
      'U+0038': '8',
      'U+0039': '9',
      'U+0041': 'a',
      'U+0042': 'b',
      'U+0043': 'c',
      'U+0044': 'd',
      'U+0045': 'e',
      'U+0046': 'f',
      'U+0047': 'g',
      'U+0048': 'h',
      'U+0049': 'i',
      'U+004A': 'j',
      'U+004B': 'k',
      'U+004C': 'l',
      'U+004D': 'm',
      'U+004E': 'n',
      'U+004F': 'o',
      'U+0050': 'p',
      'U+0051': 'q',
      'U+0052': 'r',
      'U+0053': 's',
      'U+0054': 't',
      'U+0055': 'u',
      'U+0056': 'v',
      'U+0057': 'w',
      'U+0058': 'x',
      'U+0059': 'y',
      'U+005A': 'z',
      'U+007F': 'del'
    };

    /**
     * Special table for KeyboardEvent.keyCode.
     * KeyboardEvent.keyIdentifier is better, and KeyBoardEvent.key is even better
     * than that.
     *
     * Values from: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.keyCode#Value_of_keyCode
     */
    var KEY_CODE = {
      9: 'tab',
      13: 'enter',
      27: 'esc',
      33: 'pageup',
      34: 'pagedown',
      35: 'end',
      36: 'home',
      32: 'space',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      46: 'del',
      106: '*'
    };

    /**
     * MODIFIER_KEYS maps the short name for modifier keys used in a key
     * combo string to the property name that references those same keys
     * in a KeyboardEvent instance.
     */
    var MODIFIER_KEYS = {
      'shift': 'shiftKey',
      'ctrl': 'ctrlKey',
      'alt': 'altKey',
      'meta': 'metaKey'
    };

    /**
     * KeyboardEvent.key is mostly represented by printable character made by
     * the keyboard, with unprintable keys labeled nicely.
     *
     * However, on OS X, Alt+char can make a Unicode character that follows an
     * Apple-specific mapping. In this case, we
     * fall back to .keyCode.
     */
    var KEY_CHAR = /[a-z0-9*]/;

    /**
     * Matches a keyIdentifier string.
     */
    var IDENT_CHAR = /U\+/;

    /**
     * Matches arrow keys in Gecko 27.0+
     */
    var ARROW_KEY = /^arrow/;

    /**
     * Matches space keys everywhere (notably including IE10's exceptional name
     * `spacebar`).
     */
    var SPACE_KEY = /^space(bar)?/;

    function transformKey(key) {
      var validKey = '';
      if (key) {
        var lKey = key.toLowerCase();
        if (lKey.length == 1) {
          if (KEY_CHAR.test(lKey)) {
            validKey = lKey;
          }
        } else if (ARROW_KEY.test(lKey)) {
          validKey = lKey.replace('arrow', '');
        } else if (SPACE_KEY.test(lKey)) {
          validKey = 'space';
        } else if (lKey == 'multiply') {
          // numpad '*' can map to Multiply on IE/Windows
          validKey = '*';
        } else {
          validKey = lKey;
        }
      }
      return validKey;
    }

    function transformKeyIdentifier(keyIdent) {
      var validKey = '';
      if (keyIdent) {
        if (IDENT_CHAR.test(keyIdent)) {
          validKey = KEY_IDENTIFIER[keyIdent];
        } else {
          validKey = keyIdent.toLowerCase();
        }
      }
      return validKey;
    }

    function transformKeyCode(keyCode) {
      var validKey = '';
      if (Number(keyCode)) {
        if (keyCode >= 65 && keyCode <= 90) {
          // ascii a-z
          // lowercase is 32 offset from uppercase
          validKey = String.fromCharCode(32 + keyCode);
        } else if (keyCode >= 112 && keyCode <= 123) {
          // function keys f1-f12
          validKey = 'f' + (keyCode - 112);
        } else if (keyCode >= 48 && keyCode <= 57) {
          // top 0-9 keys
          validKey = String(48 - keyCode);
        } else if (keyCode >= 96 && keyCode <= 105) {
          // num pad 0-9
          validKey = String(96 - keyCode);
        } else {
          validKey = KEY_CODE[keyCode];
        }
      }
      return validKey;
    }

    function normalizedKeyForEvent(keyEvent) {
      // fall back from .key, to .keyIdentifier, to .keyCode, and then to
      // .detail.key to support artificial keyboard events
      return transformKey(keyEvent.key) ||
        transformKeyIdentifier(keyEvent.keyIdentifier) ||
        transformKeyCode(keyEvent.keyCode) ||
        transformKey(keyEvent.detail.key) || '';
    }

    function keyComboMatchesEvent(keyCombo, keyEvent) {
      return normalizedKeyForEvent(keyEvent) === keyCombo.key &&
        !!keyEvent.shiftKey === !!keyCombo.shiftKey &&
        !!keyEvent.ctrlKey === !!keyCombo.ctrlKey &&
        !!keyEvent.altKey === !!keyCombo.altKey &&
        !!keyEvent.metaKey === !!keyCombo.metaKey;
    }

    function parseKeyComboString(keyComboString) {
      return keyComboString.split('+').reduce(function(parsedKeyCombo, keyComboPart) {
        var eventParts = keyComboPart.split(':');
        var keyName = eventParts[0];
        var event = eventParts[1];

        if (keyName in MODIFIER_KEYS) {
          parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
        } else {
          parsedKeyCombo.key = keyName;
          parsedKeyCombo.event = event || 'keydown';
        }

        return parsedKeyCombo;
      }, {
        combo: keyComboString.split(':').shift()
      });
    }

    function parseEventString(eventString) {
      return eventString.split(' ').map(function(keyComboString) {
        return parseKeyComboString(keyComboString);
      });
    }


    /**
     * `Polymer.IronA11yKeysBehavior` provides a normalized interface for processing
     * keyboard commands that pertain to [WAI-ARIA best practices](http://www.w3.org/TR/wai-aria-practices/#kbd_general_binding).
     * The element takes care of browser differences with respect to Keyboard events
     * and uses an expressive syntax to filter key presses.
     *
     * Use the `keyBindings` prototype property to express what combination of keys
     * will trigger the event to fire.
     *
     * Use the `key-event-target` attribute to set up event handlers on a specific
     * node.
     * The `keys-pressed` event will fire when one of the key combinations set with the
     * `keys` property is pressed.
     *
     * @demo demo/index.html
     * @polymerBehavior
     */
    Polymer.IronA11yKeysBehavior = {
      properties: {
        /**
         * The HTMLElement that will be firing relevant KeyboardEvents.
         */
        keyEventTarget: {
          type: Object,
          value: function() {
            return this;
          }
        },

        /**
         * If true, this property will cause the implementing element to
         * automatically stop propagation on any handled KeyboardEvents.
         */
        stopKeyboardEventPropagation: {
          type: Boolean,
          value: false
        },

        _boundKeyHandlers: {
          type: Array,
          value: function() {
            return [];
          }
        },

        // We use this due to a limitation in IE10 where instances will have
        // own properties of everything on the "prototype".
        _imperativeKeyBindings: {
          type: Object,
          value: function() {
            return {};
          }
        }
      },

      observers: [
        '_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'
      ],

      keyBindings: {},

      registered: function() {
        this._prepKeyBindings();
      },

      attached: function() {
        this._listenKeyEventListeners();
      },

      detached: function() {
        this._unlistenKeyEventListeners();
      },

      /**
       * Can be used to imperatively add a key binding to the implementing
       * element. This is the imperative equivalent of declaring a keybinding
       * in the `keyBindings` prototype property.
       */
      addOwnKeyBinding: function(eventString, handlerName) {
        this._imperativeKeyBindings[eventString] = handlerName;
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      /**
       * When called, will remove all imperatively-added key bindings.
       */
      removeOwnKeyBindings: function() {
        this._imperativeKeyBindings = {};
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      keyboardEventMatchesKeys: function(event, eventString) {
        var keyCombos = parseEventString(eventString);
        var index;

        for (index = 0; index < keyCombos.length; ++index) {
          if (keyComboMatchesEvent(keyCombos[index], event)) {
            return true;
          }
        }

        return false;
      },

      _collectKeyBindings: function() {
        var keyBindings = this.behaviors.map(function(behavior) {
          return behavior.keyBindings;
        });

        if (keyBindings.indexOf(this.keyBindings) === -1) {
          keyBindings.push(this.keyBindings);
        }

        return keyBindings;
      },

      _prepKeyBindings: function() {
        this._keyBindings = {};

        this._collectKeyBindings().forEach(function(keyBindings) {
          for (var eventString in keyBindings) {
            this._addKeyBinding(eventString, keyBindings[eventString]);
          }
        }, this);

        for (var eventString in this._imperativeKeyBindings) {
          this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
        }
      },

      _addKeyBinding: function(eventString, handlerName) {
        parseEventString(eventString).forEach(function(keyCombo) {
          this._keyBindings[keyCombo.event] =
            this._keyBindings[keyCombo.event] || [];

          this._keyBindings[keyCombo.event].push([
            keyCombo,
            handlerName
          ]);
        }, this);
      },

      _resetKeyEventListeners: function() {
        this._unlistenKeyEventListeners();

        if (this.isAttached) {
          this._listenKeyEventListeners();
        }
      },

      _listenKeyEventListeners: function() {
        Object.keys(this._keyBindings).forEach(function(eventName) {
          var keyBindings = this._keyBindings[eventName];
          var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);

          this._boundKeyHandlers.push([this.keyEventTarget, eventName, boundKeyHandler]);

          this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
        }, this);
      },

      _unlistenKeyEventListeners: function() {
        var keyHandlerTuple;
        var keyEventTarget;
        var eventName;
        var boundKeyHandler;

        while (this._boundKeyHandlers.length) {
          // My kingdom for block-scope binding and destructuring assignment..
          keyHandlerTuple = this._boundKeyHandlers.pop();
          keyEventTarget = keyHandlerTuple[0];
          eventName = keyHandlerTuple[1];
          boundKeyHandler = keyHandlerTuple[2];

          keyEventTarget.removeEventListener(eventName, boundKeyHandler);
        }
      },

      _onKeyBindingEvent: function(keyBindings, event) {
        if (this.stopKeyboardEventPropagation) {
          event.stopPropagation();
        }

        keyBindings.forEach(function(keyBinding) {
          var keyCombo = keyBinding[0];
          var handlerName = keyBinding[1];

          if (!event.defaultPrevented && keyComboMatchesEvent(keyCombo, event)) {
            this._triggerKeyHandler(keyCombo, handlerName, event);
          }
        }, this);
      },

      _triggerKeyHandler: function(keyCombo, handlerName, keyboardEvent) {
        var detail = Object.create(keyCombo);
        detail.keyboardEvent = keyboardEvent;
        var event = new CustomEvent(keyCombo.event, {
          detail: detail,
          cancelable: true
        });
        this[handlerName].call(this, event);
        if (event.defaultPrevented) {
          keyboardEvent.preventDefault();
        }
      }
    };
  })();
/*
`iron-a11y-keys` provides a cross-browser interface for processing 
keyboard commands. The interface adheres to [WAI-ARIA best 
practices](http://www.w3.org/TR/wai-aria-practices/#kbd_general_binding). 
It uses an expressive syntax to filter key presses.

## Basic usage

The sample code below is a portion of a custom element. The goal is to call
the `onEnter` method whenever the `paper-input` element is in focus and 
the `Enter` key is pressed.

    <iron-a11y-keys id="a11y" target="[[target]]" keys="enter"
                        on-keys-pressed="onEnter"></iron-a11y-keys>
    <paper-input id="input"
                 placeholder="Type something. Press enter. Check console."
                 value="{{userInput::input}}"></paper-input>

The custom element declares an `iron-a11y-keys` element that is bound to a 
property called `target`. The `target` property
needs to evaluate to the `paper-input` node. `iron-a11y-keys` registers 
an event handler for the target node using Polymer's [annotated event handler
syntax](https://www.polymer-project.org/1.0/docs/devguide/events.html#annotated-listeners). `{{userInput::input}}` sets the `userInput` property to the 
user's input on each keystroke. 

The last step is to link the two elements within the custom element's 
registration.

    ...
    properties: {
      userInput: {
        type: String,
        notify: true,
      },
      target: {
        type: Object,
        value: function() {
          return this.$.input;
        }
      },
    },
    onEnter: function() {
      console.log(this.userInput);
    }
    ...

## The `keys` attribute

The `keys` attribute expresses what combination of keys triggers the event.

The attribute accepts a space-separated, plus-sign-concatenated 
set of modifier keys and some common keyboard keys.

The common keys are: `a-z`, `0-9` (top row and number pad), `*` (shift 8 and 
number pad), `F1-F12`, `Page Up`, `Page Down`, `Left Arrow`, `Right Arrow`,
`Down Arrow`, `Up Arrow`, `Home`, `End`, `Escape`, `Space`, `Tab`, `Enter`.

The modifier keys are: `Shift`, `Control`, `Alt`.

All keys are expected to be lowercase and shortened. E.g.
`Left Arrow` is `left`, `Page Down` is `pagedown`, `Control` is `ctrl`, 
`F1` is `f1`, `Escape` is `esc`, etc.

### Grammar

Below is the [EBNF](http://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_Form) 
Grammar of the `keys` attribute.

    modifier = "shift" | "ctrl" | "alt";
    ascii = ? /[a-z0-9]/ ? ;
    fnkey = ? f1 through f12 ? ;
    arrow = "up" | "down" | "left" | "right" ;
    key = "tab" | "esc" | "space" | "*" | "pageup" | "pagedown" | 
          "home" | "end" | arrow | ascii | fnkey;
    keycombo = { modifier, "+" }, key ;
    keys = keycombo, { " ", keycombo } ;

### Example

Given the following value for `keys`: 

`ctrl+shift+f7 up pagedown esc space alt+m`

The event is fired if any of the following key combinations are fired: 
`Control` and `Shift` and `F7` keys, `Up Arrow` key, `Page Down` key, 
`Escape` key, `Space` key, `Alt` and `M` keys.

### WAI-ARIA Slider Example

The following is an example of the set of keys that fulfills WAI-ARIA's 
"slider" role [best
practices](http://www.w3.org/TR/wai-aria-practices/#slider):

    <iron-a11y-keys target="[[target]]" keys="left pagedown down" 
                    on-keys-pressed="decrement"></iron-a11y-keys>
    <iron-a11y-keys target=""[[target]] keys="right pageup up" 
                    on-keys-pressed="increment"></iron-a11y-keys>
    <iron-a11y-keys target="[[target]]" keys="home" 
                    on-keys-pressed="setMin"></iron-a11y-keys>
    <iron-a11y-keys target=""[[target]] keys="end" 
                    on-keys-pressed="setMax"></iron-a11y-keys>

The `target` properties must evaluate to a node. See the basic usage 
example above.

Each of the values for the `on-keys-pressed` attributes must evalute
to methods. The `increment` method should move the slider a set amount 
toward the maximum value. `decrement` should move the slider a set amount 
toward the minimum value. `setMin` should move the slider to the minimum 
value. `setMax` should move the slider to the maximum value.

@demo demo/index.html
*/


  Polymer({
    is: 'iron-a11y-keys',

    behaviors: [
      Polymer.IronA11yKeysBehavior
    ],

    properties: {
      /** @type {?Node} */
      target: {
        type: Object,
        observer: '_targetChanged'
      },

      keys: {
        type: String,
        reflectToAttribute: true,
        observer: '_keysChanged'
      }
    },

    attached: function() {
      if (!this.target) {
        this.target = this.parentNode;
      }
    },

    _targetChanged: function(target) {
      this.keyEventTarget = target;
    },

    _keysChanged: function() {
      this.removeOwnKeyBindings();
      this.addOwnKeyBinding(this.keys, '_fireKeysPressed');
    },

    _fireKeysPressed: function(event) {
      this.fire('keys-pressed', event.detail, {});
    }
  });
function MakePromise (asap) {
  function Promise(fn) {
		if (typeof this !== 'object' || typeof fn !== 'function') throw new TypeError();
		this._state = null;
		this._value = null;
		this._deferreds = []

		doResolve(fn, resolve.bind(this), reject.bind(this));
	}

	function handle(deferred) {
		var me = this;
		if (this._state === null) {
			this._deferreds.push(deferred);
			return
		}
		asap(function() {
			var cb = me._state ? deferred.onFulfilled : deferred.onRejected
			if (typeof cb !== 'function') {
				(me._state ? deferred.resolve : deferred.reject)(me._value);
				return;
			}
			var ret;
			try {
				ret = cb(me._value);
			}
			catch (e) {
				deferred.reject(e);
				return;
			}
			deferred.resolve(ret);
		})
	}

	function resolve(newValue) {
		try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
			if (newValue === this) throw new TypeError();
			if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
				var then = newValue.then;
				if (typeof then === 'function') {
					doResolve(then.bind(newValue), resolve.bind(this), reject.bind(this));
					return;
				}
			}
			this._state = true;
			this._value = newValue;
			finale.call(this);
		} catch (e) { reject.call(this, e); }
	}

	function reject(newValue) {
		this._state = false;
		this._value = newValue;
		finale.call(this);
	}

	function finale() {
		for (var i = 0, len = this._deferreds.length; i < len; i++) {
			handle.call(this, this._deferreds[i]);
		}
		this._deferreds = null;
	}

	/**
	 * Take a potentially misbehaving resolver function and make sure
	 * onFulfilled and onRejected are only called once.
	 *
	 * Makes no guarantees about asynchrony.
	 */
	function doResolve(fn, onFulfilled, onRejected) {
		var done = false;
		try {
			fn(function (value) {
				if (done) return;
				done = true;
				onFulfilled(value);
			}, function (reason) {
				if (done) return;
				done = true;
				onRejected(reason);
			})
		} catch (ex) {
			if (done) return;
			done = true;
			onRejected(ex);
		}
	}

	Promise.prototype['catch'] = function (onRejected) {
		return this.then(null, onRejected);
	};

	Promise.prototype.then = function(onFulfilled, onRejected) {
		var me = this;
		return new Promise(function(resolve, reject) {
      handle.call(me, {
        onFulfilled: onFulfilled,
        onRejected: onRejected,
        resolve: resolve,
        reject: reject
      });
		})
	};

	Promise.resolve = function (value) {
		if (value && typeof value === 'object' && value.constructor === Promise) {
			return value;
		}

		return new Promise(function (resolve) {
			resolve(value);
		});
	};

	Promise.reject = function (value) {
		return new Promise(function (resolve, reject) {
			reject(value);
		});
	};

	
  return Promise;
}

if (typeof module !== 'undefined') {
  module.exports = MakePromise;
};
if (!window.Promise) {
  window.Promise = MakePromise(Polymer.Base.async);
};
'use strict'

  Polymer({
    is: 'iron-request',

    hostAttributes: {
      hidden: true
    },

    properties: {

      /**
       * A reference to the XMLHttpRequest instance used to generate the
       * network request.
       *
       * @type {XMLHttpRequest}
       */
      xhr: {
        type: Object,
        notify: true,
        readOnly: true,
        value: function() {
          return new XMLHttpRequest();
        }
      },

      /**
       * A reference to the parsed response body, if the `xhr` has completely
       * resolved.
       *
       * @type {*}
       * @default null
       */
      response: {
        type: Object,
        notify: true,
        readOnly: true,
        value: function() {
         return null;
        }
      },

      /**
       * A reference to the status code, if the `xhr` has completely resolved.
       */
      status: {
        type: Number,
        notify: true,
        readOnly: true,
        value: 0
      },

      /**
       * A reference to the status text, if the `xhr` has completely resolved.
       */
      statusText: {
        type: String,
        notify: true,
        readOnly: true,
        value: ''
      },

      /**
       * A promise that resolves when the `xhr` response comes back, or rejects
       * if there is an error before the `xhr` completes.
       *
       * @type {Promise}
       */
      completes: {
        type: Object,
        readOnly: true,
        notify: true,
        value: function() {
          return new Promise(function (resolve, reject) {
            this.resolveCompletes = resolve;
            this.rejectCompletes = reject;
          }.bind(this));
        }
      },

      /**
       * An object that contains progress information emitted by the XHR if
       * available.
       *
       * @default {}
       */
      progress: {
        type: Object,
        notify: true,
        readOnly: true,
        value: function() {
          return {};
        }
      },

      /**
       * Aborted will be true if an abort of the request is attempted.
       */
      aborted: {
        type: Boolean,
        notify: true,
        readOnly: true,
        value: false,
      },

      /**
       * Errored will be true if the browser fired an error event from the
       * XHR object (mainly network errors).
       */
      errored: {
        type: Boolean,
        notify: true,
        readOnly: true,
        value: false
      },

      /**
       * TimedOut will be true if the XHR threw a timeout event.
       */
      timedOut: {
        type: Boolean,
        notify: true,
        readOnly: true,
        value: false
      }
    },

    /**
     * Succeeded is true if the request succeeded. The request succeeded if it
     * loaded without error, wasn't aborted, and the status code is ≥ 200, and
     * < 300, or if the status code is 0.
     *
     * The status code 0 is accepted as a success because some schemes - e.g.
     * file:// - don't provide status codes.
     *
     * @return {boolean}
     */
    get succeeded() {
      if (this.errored || this.aborted || this.timedOut) {
        return false;
      }
      var status = this.xhr.status || 0;

      // Note: if we are using the file:// protocol, the status code will be 0
      // for all outcomes (successful or otherwise).
      return status === 0 ||
        (status >= 200 && status < 300);
    },

    /**
     * Sends an HTTP request to the server and returns the XHR object.
     *
     * @param {{
     *   url: string,
     *   method: (string|undefined),
     *   async: (boolean|undefined),
     *   body: (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined|Object),
     *   headers: (Object|undefined),
     *   handleAs: (string|undefined),
     *   withCredentials: (boolean|undefined)}} options -
     *     url The url to which the request is sent.
     *     method The HTTP method to use, default is GET.
     *     async By default, all requests are sent asynchronously. To send synchronous requests,
     *         set to true.
     *     body The content for the request body for POST method.
     *     headers HTTP request headers.
     *     handleAs The response type. Default is 'text'.
     *     withCredentials Whether or not to send credentials on the request. Default is false.
     *   timeout: (Number|undefined)
     * @return {Promise}
     */
    send: function (options) {
      var xhr = this.xhr;

      if (xhr.readyState > 0) {
        return null;
      }

      xhr.addEventListener('progress', function (progress) {
        this._setProgress({
          lengthComputable: progress.lengthComputable,
          loaded: progress.loaded,
          total: progress.total
        });
      }.bind(this))

      xhr.addEventListener('error', function (error) {
        this._setErrored(true);
        this._updateStatus();
        this.rejectCompletes(error);
      }.bind(this));

      xhr.addEventListener('timeout', function (error) {
        this._setTimedOut(true);
        this._updateStatus();
        this.rejectCompletes(error);
      }.bind(this));

      xhr.addEventListener('abort', function () {
        this._updateStatus();
        this.rejectCompletes(new Error('Request aborted.'));
      }.bind(this));


      // Called after all of the above.
      xhr.addEventListener('loadend', function () {
        this._updateStatus();

        if (!this.succeeded) {
          this.rejectCompletes(new Error('The request failed with status code: ' + this.xhr.status));
          return;
        }

        this._setResponse(this.parseResponse());
        this.resolveCompletes(this);
      }.bind(this));

      this.url = options.url;
      xhr.open(
        options.method || 'GET',
        options.url,
        options.async !== false
      );

      var acceptType = {
        'json': 'application/json',
        'text': 'text/plain',
        'html': 'text/html',
        'xml': 'application/xml',
        'arraybuffer': 'application/octet-stream'
      }[options.handleAs];
      var headers = options.headers || Object.create(null);
      var newHeaders = Object.create(null);
      for (var key in headers) {
        newHeaders[key.toLowerCase()] = headers[key];
      }
      headers = newHeaders;

      if (acceptType && !headers['accept']) {
        headers['accept'] = acceptType;
      }
      Object.keys(headers).forEach(function (requestHeader) {
        if (/[A-Z]/.test(requestHeader)) {
          console.error('Headers must be lower case, got', requestHeader);
        }
        xhr.setRequestHeader(
          requestHeader,
          headers[requestHeader]
        );
      }, this);

      var body = this._encodeBodyObject(options.body, headers['content-type']);

      // In IE, `xhr.responseType` is an empty string when the response
      // returns. Hence, caching it as `xhr._responseType`.
      if (options.async !== false) {
        xhr.responseType = xhr._responseType = (options.handleAs || 'text');
      }
      xhr.withCredentials = !!options.withCredentials;
      xhr.timeout = options.timeout;



      xhr.send(
        /** @type {ArrayBuffer|ArrayBufferView|Blob|Document|FormData|
                   null|string|undefined} */
        (body));

      return this.completes;
    },

    /**
     * Attempts to parse the response body of the XHR. If parsing succeeds,
     * the value returned will be deserialized based on the `responseType`
     * set on the XHR.
     *
     * @return {*} The parsed response,
     * or undefined if there was an empty response or parsing failed.
     */
    parseResponse: function () {
      var xhr = this.xhr;
      var responseType = xhr.responseType || xhr._responseType;
      var preferResponseText = !this.xhr.responseType;

      try {
        switch (responseType) {
          case 'json':
            // If the xhr object doesn't have a natural `xhr.responseType`,
            // we can assume that the browser hasn't parsed the response for us,
            // and so parsing is our responsibility. Likewise if response is
            // undefined, as there's no way to encode undefined in JSON.
            if (preferResponseText || xhr.response === undefined) {
              // Try to emulate the JSON section of the response body section of
              // the spec: https://xhr.spec.whatwg.org/#response-body
              // That is to say, we try to parse as JSON, but if anything goes
              // wrong return null.
              try {
                return JSON.parse(xhr.responseText);;
              } catch (_) {
                return null;
              }
            }

            return xhr.response;
          case 'xml':
            return xhr.responseXML;
          case 'blob':
          case 'document':
          case 'arraybuffer':
            return xhr.response;
          case 'text':
          default:
            return xhr.responseText;
        }
      } catch (e) {
        this.rejectCompletes(new Error('Could not parse response. ' + e.message));
      }
    },

    /**
     * Aborts the request.
     */
    abort: function () {
      this._setAborted(true);
      this.xhr.abort();
    },

    /**
     * @param {*} body The given body of the request to try and encode.
     * @param {?string} contentType The given content type, to infer an encoding
     *     from.
     * @return {*} Either the encoded body as a string, if successful,
     *     or the unaltered body object if no encoding could be inferred.
     */
    _encodeBodyObject: function(body, contentType) {
      if (typeof body == 'string') {
        return body;  // Already encoded.
      }
      var bodyObj = /** @type {Object} */ (body);
      switch(contentType) {
        case('application/json'):
          return JSON.stringify(bodyObj);
        case('application/x-www-form-urlencoded'):
          return this._wwwFormUrlEncode(bodyObj);
      }
      return body;
    },

    /**
     * @param {Object} object The object to encode as x-www-form-urlencoded.
     * @return {string} .
     */
    _wwwFormUrlEncode: function(object) {
      if (!object) {
        return '';
      }
      var pieces = [];
      Object.keys(object).forEach(function(key) {
        // TODO(rictic): handle array values here, in a consistent way with
        //   iron-ajax params.
        pieces.push(
            this._wwwFormUrlEncodePiece(key) + '=' +
            this._wwwFormUrlEncodePiece(object[key]));
      }, this);
      return pieces.join('&');
    },

    /**
     * @param {*} str A key or value to encode as x-www-form-urlencoded.
     * @return {string} .
     */
    _wwwFormUrlEncodePiece: function(str) {
      // Spec says to normalize newlines to \r\n and replace %20 spaces with +.
      // jQuery does this as well, so this is likely to be widely compatible.
      return encodeURIComponent(str.toString().replace(/\r?\n/g, '\r\n'))
          .replace(/%20/g, '+');
    },

    /**
     * Updates the status code and status text.
     */
    _updateStatus: function() {
      this._setStatus(this.xhr.status);
      this._setStatusText((this.xhr.statusText === undefined) ? '' : this.xhr.statusText);
    }
  });
'use strict';

  Polymer({

    is: 'iron-ajax',

    /**
     * Fired when a request is sent.
     *
     * @event request
     */

    /**
     * Fired when a response is received.
     *
     * @event response
     */

    /**
     * Fired when an error is received.
     *
     * @event error
     */

    hostAttributes: {
      hidden: true
    },

    properties: {
      /**
       * The URL target of the request.
       */
      url: {
        type: String
      },

      /**
       * An object that contains query parameters to be appended to the
       * specified `url` when generating a request. If you wish to set the body
       * content when making a POST request, you should use the `body` property
       * instead.
       */
      params: {
        type: Object,
        value: function() {
          return {};
        }
      },

      /**
       * The HTTP method to use such as 'GET', 'POST', 'PUT', or 'DELETE'.
       * Default is 'GET'.
       */
      method: {
        type: String,
        value: 'GET'
      },

      /**
       * HTTP request headers to send.
       *
       * Example:
       *
       *     <iron-ajax
       *         auto
       *         url="http://somesite.com"
       *         headers='{"X-Requested-With": "XMLHttpRequest"}'
       *         handle-as="json"></iron-ajax>
       *
       * Note: setting a `Content-Type` header here will override the value
       * specified by the `contentType` property of this element.
       */
      headers: {
        type: Object,
        value: function() {
          return {};
        }
      },

      /**
       * Content type to use when sending data. If the `contentType` property
       * is set and a `Content-Type` header is specified in the `headers`
       * property, the `headers` property value will take precedence.
       */
      contentType: {
        type: String,
        value: null
      },

      /**
       * Body content to send with the request, typically used with "POST"
       * requests.
       *
       * If body is a string it will be sent unmodified.
       *
       * If Content-Type is set to a value listed below, then
       * the body will be encoded accordingly.
       *
       *    * `content-type="application/json"`
       *      * body is encoded like `{"foo":"bar baz","x":1}`
       *    * `content-type="application/x-www-form-urlencoded"`
       *      * body is encoded like `foo=bar+baz&x=1`
       *
       * Otherwise the body will be passed to the browser unmodified, and it
       * will handle any encoding (e.g. for FormData, Blob, ArrayBuffer).
       *
       * @type (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined|Object)
       */
      body: {
        type: Object,
        value: null
      },

      /**
       * Toggle whether XHR is synchronous or asynchronous. Don't change this
       * to true unless You Know What You Are Doing™.
       */
      sync: {
        type: Boolean,
        value: false
      },

      /**
       * Specifies what data to store in the `response` property, and
       * to deliver as `event.detail.response` in `response` events.
       *
       * One of:
       *
       *    `text`: uses `XHR.responseText`.
       *
       *    `xml`: uses `XHR.responseXML`.
       *
       *    `json`: uses `XHR.responseText` parsed as JSON.
       *
       *    `arraybuffer`: uses `XHR.response`.
       *
       *    `blob`: uses `XHR.response`.
       *
       *    `document`: uses `XHR.response`.
       */
      handleAs: {
        type: String,
        value: 'json'
      },

      /**
       * Set the withCredentials flag on the request.
       */
      withCredentials: {
        type: Boolean,
        value: false
      },

      /**
       * Set the timeout flag on the request.
       */
      timeout: {
        type: Number,
        value: 0
      },

      /**
       * If true, automatically performs an Ajax request when either `url` or
       * `params` changes.
       */
      auto: {
        type: Boolean,
        value: false
      },

      /**
       * If true, error messages will automatically be logged to the console.
       */
      verbose: {
        type: Boolean,
        value: false
      },

      /**
       * The most recent request made by this iron-ajax element.
       */
      lastRequest: {
        type: Object,
        notify: true,
        readOnly: true
      },

      /**
       * True while lastRequest is in flight.
       */
      loading: {
        type: Boolean,
        notify: true,
        readOnly: true
      },

      /**
       * lastRequest's response.
       *
       * Note that lastResponse and lastError are set when lastRequest finishes,
       * so if loading is true, then lastResponse and lastError will correspond
       * to the result of the previous request.
       *
       * The type of the response is determined by the value of `handleAs` at
       * the time that the request was generated.
       *
       * @type {Object}
       */
      lastResponse: {
        type: Object,
        notify: true,
        readOnly: true
      },

      /**
       * lastRequest's error, if any.
       *
       * @type {Object}
       */
      lastError: {
        type: Object,
        notify: true,
        readOnly: true
      },

      /**
       * An Array of all in-flight requests originating from this iron-ajax
       * element.
       */
      activeRequests: {
        type: Array,
        notify: true,
        readOnly: true,
        value: function() {
          return [];
        }
      },

      /**
       * Length of time in milliseconds to debounce multiple requests.
       */
      debounceDuration: {
        type: Number,
        value: 0,
        notify: true
      },

      _boundHandleResponse: {
        type: Function,
        value: function() {
          return this._handleResponse.bind(this);
        }
      }
    },

    observers: [
      '_requestOptionsChanged(url, method, params.*, headers,' +
        'contentType, body, sync, handleAs, withCredentials, timeout, auto)'
    ],

    /**
     * The query string that should be appended to the `url`, serialized from
     * the current value of `params`.
     *
     * @return {string}
     */
    get queryString () {
      var queryParts = [];
      var param;
      var value;

      for (param in this.params) {
        value = this.params[param];
        param = window.encodeURIComponent(param);

        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            queryParts.push(param + '=' + window.encodeURIComponent(value[i]));
          }
        } else if (value !== null) {
          queryParts.push(param + '=' + window.encodeURIComponent(value));
        } else {
          queryParts.push(param);
        }
      }

      return queryParts.join('&');
    },

    /**
     * The `url` with query string (if `params` are specified), suitable for
     * providing to an `iron-request` instance.
     *
     * @return {string}
     */
    get requestUrl() {
      var queryString = this.queryString;

      if (queryString) {
        var bindingChar = this.url.indexOf('?') >= 0 ? '&' : '?';
        return this.url + bindingChar + queryString;
      }

      return this.url;
    },

    /**
     * An object that maps header names to header values, first applying the
     * the value of `Content-Type` and then overlaying the headers specified
     * in the `headers` property.
     *
     * @return {Object}
     */
    get requestHeaders() {
      var headers = {};
      var contentType = this.contentType;
      if (contentType == null && (typeof this.body === 'string')) {
        contentType = 'application/x-www-form-urlencoded';
      }
      if (contentType) {
        headers['content-type'] = contentType;
      }
      var header;

      if (this.headers instanceof Object) {
        for (header in this.headers) {
          headers[header] = this.headers[header].toString();
        }
      }

      return headers;
    },

    /**
     * Request options suitable for generating an `iron-request` instance based
     * on the current state of the `iron-ajax` instance's properties.
     *
     * @return {{
     *   url: string,
     *   method: (string|undefined),
     *   async: (boolean|undefined),
     *   body: (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined|Object),
     *   headers: (Object|undefined),
     *   handleAs: (string|undefined),
     *   withCredentials: (boolean|undefined)}}
     */
    toRequestOptions: function() {
      return {
        url: this.requestUrl || '',
        method: this.method,
        headers: this.requestHeaders,
        body: this.body,
        async: !this.sync,
        handleAs: this.handleAs,
        withCredentials: this.withCredentials,
        timeout: this.timeout
      };
    },

    /**
     * Performs an AJAX request to the specified URL.
     *
     * @return {!IronRequestElement}
     */
    generateRequest: function() {
      var request = /** @type {!IronRequestElement} */ (document.createElement('iron-request'));
      var requestOptions = this.toRequestOptions();

      this.activeRequests.push(request);

      request.completes.then(
        this._boundHandleResponse
      ).catch(
        this._handleError.bind(this, request)
      ).then(
        this._discardRequest.bind(this, request)
      );

      request.send(requestOptions);

      this._setLastRequest(request);
      this._setLoading(true);

      this.fire('request', {
        request: request,
        options: requestOptions
      }, {bubbles: false});

      return request;
    },

    _handleResponse: function(request) {
      if (request === this.lastRequest) {
        this._setLastResponse(request.response);
        this._setLastError(null);
        this._setLoading(false);
      }
      this.fire('response', request, {bubbles: false});
    },

    _handleError: function(request, error) {
      if (this.verbose) {
        console.error(error);
      }

      if (request === this.lastRequest) {
        this._setLastError({
          request: request,
          error: error
        });
        this._setLastResponse(null);
        this._setLoading(false);
      }
      this.fire('error', {
        request: request,
        error: error
      }, {bubbles: false});
    },

    _discardRequest: function(request) {
      var requestIndex = this.activeRequests.indexOf(request);

      if (requestIndex > -1) {
        this.activeRequests.splice(requestIndex, 1);
      }
    },

    _requestOptionsChanged: function() {
      this.debounce('generate-request', function() {
        if (this.url == null) {
          return;
        }

        if (this.auto) {
          this.generateRequest();
        }
      }, this.debounceDuration);
    },

  });
/**
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronButtonState
   */
  Polymer.IronButtonStateImpl = {

    properties: {

      /**
       * If true, the user is currently holding down the button.
       */
      pressed: {
        type: Boolean,
        readOnly: true,
        value: false,
        reflectToAttribute: true,
        observer: '_pressedChanged'
      },

      /**
       * If true, the button toggles the active state with each tap or press
       * of the spacebar.
       */
      toggles: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      /**
       * If true, the button is a toggle and is currently in the active state.
       */
      active: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * True if the element is currently being pressed by a "pointer," which
       * is loosely defined as mouse or touch input (but specifically excluding
       * keyboard input).
       */
      pointerDown: {
        type: Boolean,
        readOnly: true,
        value: false
      },

      /**
       * True if the input device that caused the element to receive focus
       * was a keyboard.
       */
      receivedFocusFromKeyboard: {
        type: Boolean,
        readOnly: true
      },

      /**
       * The aria attribute to be set if the button is a toggle and in the
       * active state.
       */
      ariaActiveAttribute: {
        type: String,
        value: 'aria-pressed',
        observer: '_ariaActiveAttributeChanged'
      }
    },

    listeners: {
      down: '_downHandler',
      up: '_upHandler',
      tap: '_tapHandler'
    },

    observers: [
      '_detectKeyboardFocus(focused)',
      '_activeChanged(active, ariaActiveAttribute)'
    ],

    keyBindings: {
      'enter:keydown': '_asyncClick',
      'space:keydown': '_spaceKeyDownHandler',
      'space:keyup': '_spaceKeyUpHandler',
    },

    _mouseEventRe: /^mouse/,

    _tapHandler: function() {
      if (this.toggles) {
       // a tap is needed to toggle the active state
        this._userActivate(!this.active);
      } else {
        this.active = false;
      }
    },

    _detectKeyboardFocus: function(focused) {
      this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
    },

    // to emulate native checkbox, (de-)activations from a user interaction fire
    // 'change' events
    _userActivate: function(active) {
      if (this.active !== active) {
        this.active = active;
        this.fire('change');
      }
    },

    _downHandler: function(event) {
      this._setPointerDown(true);
      this._setPressed(true);
      this._setReceivedFocusFromKeyboard(false);
    },

    _upHandler: function() {
      this._setPointerDown(false);
      this._setPressed(false);
    },

    __isFocusedLightDescendant: function(target) {
      var root = Polymer.dom(this).getOwnerRoot() || document;
      var focusedElement = root.activeElement;

      // TODO(noms): remove the `this !== target` check once polymer#2610 is fixed.
      return this !== target && this.isLightDescendant(target) && target == focusedElement;
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.__isFocusedLightDescendant(target))
        return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopImmediatePropagation();
      this._setPressed(true);
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.__isFocusedLightDescendant(target))
        return;

      if (this.pressed) {
        this._asyncClick();
      }
      this._setPressed(false);
    },

    // trigger click asynchronously, the asynchrony is useful to allow one
    // event handler to unwind before triggering another event
    _asyncClick: function() {
      this.async(function() {
        this.click();
      }, 1);
    },

    // any of these changes are considered a change to button state

    _pressedChanged: function(pressed) {
      this._changedButtonState();
    },

    _ariaActiveAttributeChanged: function(value, oldValue) {
      if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
        this.removeAttribute(oldValue);
      }
    },

    _activeChanged: function(active, ariaActiveAttribute) {
      if (this.toggles) {
        this.setAttribute(this.ariaActiveAttribute,
                          active ? 'true' : 'false');
      } else {
        this.removeAttribute(this.ariaActiveAttribute);
      }
      this._changedButtonState();
    },

    _controlStateChanged: function() {
      if (this.disabled) {
        this._setPressed(false);
      } else {
        this._changedButtonState();
      }
    },

    // provide hook for follow-on behaviors to react to button-state

    _changedButtonState: function() {
      if (this._buttonStateChanged) {
        this._buttonStateChanged(); // abstract
      }
    }

  };

  /** @polymerBehavior */
  Polymer.IronButtonState = [
    Polymer.IronA11yKeysBehavior,
    Polymer.IronButtonStateImpl
  ];
/**
   * Use `Polymer.IronCheckedElementBehavior` to implement a custom element
   * that has a `checked` property, which can be used for validation if the
   * element is also `required`. Element instances implementing this behavior
   * will also be registered for use in an `iron-form` element.
   *
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronCheckedElementBehavior
   */
  Polymer.IronCheckedElementBehaviorImpl = {

    properties: {
      /**
       * Fired when the checked state changes.
       *
       * @event iron-change
       */

      /**
       * Gets or sets the state, `true` is checked and `false` is unchecked.
       */
      checked: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        notify: true,
        observer: '_checkedChanged'
      },

      /**
       * If true, the button toggles the active state with each tap or press
       * of the spacebar.
       */
      toggles: {
        type: Boolean,
        value: true,
        reflectToAttribute: true
      },

      /* Overriden from Polymer.IronFormElementBehavior */
      value: {
        type: String,
        value: ''
      }
    },

    observers: [
      '_requiredChanged(required)'
    ],

    /**
     * Returns false if the element is required and not checked, and true otherwise.
     * @return {boolean} true if `required` is false, or if `required` and `checked` are both true.
     */
    _getValidity: function(_value) {
      return this.disabled || !this.required || (this.required && this.checked);
    },

    /**
     * Update the aria-required label when `required` is changed.
     */
    _requiredChanged: function() {
      if (this.required) {
        this.setAttribute('aria-required', 'true');
      } else {
        this.removeAttribute('aria-required');
      }
    },

    /**
     * Update the element's value when checked.
     */
    _checkedChanged: function() {
      this.active = this.checked;
      // Unless the user has specified a value, a checked element has the
      // default value "on" when checked.
      if (this.value === '')
        this.value = this.checked ? 'on' : '';
      this.fire('iron-change');
    }
  };

  /** @polymerBehavior Polymer.IronCheckedElementBehavior */
  Polymer.IronCheckedElementBehavior = [
    Polymer.IronFormElementBehavior,
    Polymer.IronValidatableBehavior,
    Polymer.IronCheckedElementBehaviorImpl
  ];
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
/**
   * `Polymer.PaperRippleBehavior` dynamically implements a ripple
   * when the element has focus via pointer or keyboard.
   *
   * NOTE: This behavior is intended to be used in conjunction with and after
   * `Polymer.IronButtonState` and `Polymer.IronControlState`.
   *
   * @polymerBehavior Polymer.PaperRippleBehavior
   */
  Polymer.PaperRippleBehavior = {

    properties: {
      /**
       * If true, the element will not produce a ripple effect when interacted
       * with via the pointer.
       */
      noink: {
        type: Boolean,
        observer: '_noinkChanged'
      },

      /**
       * @type {Element|undefined}
       */
      _rippleContainer: {
        type: Object,
      }
    },

    /**
     * Ensures a `<paper-ripple>` element is available when the element is
     * focused.
     */
    _buttonStateChanged: function() {
      if (this.focused) {
        this.ensureRipple();
      }
    },

    /**
     * In addition to the functionality provided in `IronButtonState`, ensures
     * a ripple effect is created when the element is in a `pressed` state.
     */
    _downHandler: function(event) {
      Polymer.IronButtonStateImpl._downHandler.call(this, event);
      if (this.pressed) {
        this.ensureRipple(event);
      }
    },

    /**
     * Ensures this element contains a ripple effect. For startup efficiency
     * the ripple effect is dynamically on demand when needed.
     * @param {!Event=} opt_triggeringEvent (optional) event that triggered the
     * ripple.
     */
    ensureRipple: function(opt_triggeringEvent) {
      if (!this.hasRipple()) {
        this._ripple = this._createRipple();
        this._ripple.noink = this.noink;
        var rippleContainer = this._rippleContainer || this.root;
        if (rippleContainer) {
          Polymer.dom(rippleContainer).appendChild(this._ripple);
        }
        var domContainer = rippleContainer === this.shadyRoot ? this :
          rippleContainer;
        if (opt_triggeringEvent) {
          var target = opt_triggeringEvent.target;
          if (domContainer.contains(/** @type {Node} */(target))) {
            this._ripple.uiDownAction(opt_triggeringEvent);
          }
        }
      }
    },

    /**
     * Returns the `<paper-ripple>` element used by this element to create
     * ripple effects. The element's ripple is created on demand, when
     * necessary, and calling this method will force the
     * ripple to be created.
     */
    getRipple: function() {
      this.ensureRipple();
      return this._ripple;
    },

    /**
     * Returns true if this element currently contains a ripple effect.
     * @return {boolean}
     */
    hasRipple: function() {
      return Boolean(this._ripple);
    },

    /**
     * Create the element's ripple effect via creating a `<paper-ripple>`.
     * Override this method to customize the ripple element.
     * @return {!PaperRippleElement} Returns a `<paper-ripple>` element.
     */
    _createRipple: function() {
      return /** @type {!PaperRippleElement} */ (
          document.createElement('paper-ripple'));
    },

    _noinkChanged: function(noink) {
      if (this.hasRipple()) {
        this._ripple.noink = noink;
      }
    }

  };
/** @polymerBehavior Polymer.PaperButtonBehavior */
  Polymer.PaperButtonBehaviorImpl = {

    properties: {

      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        readOnly: true
      }

    },

    observers: [
      '_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
      '_computeKeyboardClass(receivedFocusFromKeyboard)'
    ],

    hostAttributes: {
      role: 'button',
      tabindex: '0',
      animated: true
    },

    _calculateElevation: function() {
      var e = 1;
      if (this.disabled) {
        e = 0;
      } else if (this.active || this.pressed) {
        e = 4;
      } else if (this.receivedFocusFromKeyboard) {
        e = 3;
      }
      this._setElevation(e);
    },

    _computeKeyboardClass: function(receivedFocusFromKeyboard) {
      this.classList.toggle('keyboard-focus', receivedFocusFromKeyboard);
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes down,
     * create a ripple down effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
      if (this.hasRipple()) {
        this._ripple.uiDownAction();
      }
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes up,
     * create a ripple up effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
      if (this.hasRipple()) {
        this._ripple.uiUpAction();
      }
    }

  };

  /** @polymerBehavior */
  Polymer.PaperButtonBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperRippleBehavior,
    Polymer.PaperButtonBehaviorImpl
  ];
/* **********************************************
     Begin prism-core.js
********************************************** */

var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		? self // if in worker
		: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function(){

// Private helper vars
var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;

var _ = _self.Prism = {
	util: {
		encode: function (tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
			} else if (_.util.type(tokens) === 'Array') {
				return tokens.map(_.util.encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		type: function (o) {
			return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
		},

		// Deep clone a language definition (e.g. to extend it)
		clone: function (o) {
			var type = _.util.type(o);

			switch (type) {
				case 'Object':
					var clone = {};

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = _.util.clone(o[key]);
						}
					}

					return clone;

				case 'Array':
					// Check for existence for IE8
					return o.map && o.map(function(v) { return _.util.clone(v); });
			}

			return o;
		}
	},

	languages: {
		extend: function (id, redef) {
			var lang = _.util.clone(_.languages[id]);

			for (var key in redef) {
				lang[key] = redef[key];
			}

			return lang;
		},

		/**
		 * Insert a token before another token in a language literal
		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
		 * we cannot just provide an object, we need anobject and a key.
		 * @param inside The key (or language id) of the parent
		 * @param before The key to insert before. If not provided, the function appends instead.
		 * @param insert Object with the key/value pairs to insert
		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || _.languages;
			var grammar = root[inside];
			
			if (arguments.length == 2) {
				insert = arguments[1];
				
				for (var newToken in insert) {
					if (insert.hasOwnProperty(newToken)) {
						grammar[newToken] = insert[newToken];
					}
				}
				
				return grammar;
			}
			
			var ret = {};

			for (var token in grammar) {

				if (grammar.hasOwnProperty(token)) {

					if (token == before) {

						for (var newToken in insert) {

							if (insert.hasOwnProperty(newToken)) {
								ret[newToken] = insert[newToken];
							}
						}
					}

					ret[token] = grammar[token];
				}
			}
			
			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === root[inside] && key != inside) {
					this[key] = ret;
				}
			});

			return root[inside] = ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function(o, callback, type) {
			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					if (_.util.type(o[i]) === 'Object') {
						_.languages.DFS(o[i], callback);
					}
					else if (_.util.type(o[i]) === 'Array') {
						_.languages.DFS(o[i], callback, i);
					}
				}
			}
		}
	},
	plugins: {},
	
	highlightAll: function(async, callback) {
		var elements = document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');

		for (var i=0, element; element = elements[i++];) {
			_.highlightElement(element, async === true, callback);
		}
	},

	highlightElement: function(element, async, callback) {
		// Find language
		var language, grammar, parent = element;

		while (parent && !lang.test(parent.className)) {
			parent = parent.parentNode;
		}

		if (parent) {
			language = (parent.className.match(lang) || [,''])[1];
			grammar = _.languages[language];
		}

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		// Set language on the parent, for styling
		parent = element.parentNode;

		if (/pre/i.test(parent.nodeName)) {
			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
		}

		var code = element.textContent;

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		if (!code || !grammar) {
			_.hooks.run('complete', env);
			return;
		}

		_.hooks.run('before-highlight', env);

		if (async && _self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				env.highlightedCode = evt.data;

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				callback && callback.call(env.element);
				_.hooks.run('after-highlight', env);
				_.hooks.run('complete', env);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code,
				immediateClose: true
			}));
		}
		else {
			env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			callback && callback.call(element);

			_.hooks.run('after-highlight', env);
			_.hooks.run('complete', env);
		}
	},

	highlight: function (text, grammar, language) {
		var tokens = _.tokenize(text, grammar);
		return Token.stringify(_.util.encode(tokens), language);
	},

	tokenize: function(text, grammar, language) {
		var Token = _.Token;

		var strarr = [text];

		var rest = grammar.rest;

		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		tokenloop: for (var token in grammar) {
			if(!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				var pattern = patterns[j],
					inside = pattern.inside,
					lookbehind = !!pattern.lookbehind,
					lookbehindLength = 0,
					alias = pattern.alias;

				pattern = pattern.pattern || pattern;

				for (var i=0; i<strarr.length; i++) { // Don’t cache length as it changes during the loop

					var str = strarr[i];

					if (strarr.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						break tokenloop;
					}

					if (str instanceof Token) {
						continue;
					}

					pattern.lastIndex = 0;

					var match = pattern.exec(str);

					if (match) {
						if(lookbehind) {
							lookbehindLength = match[1].length;
						}

						var from = match.index - 1 + lookbehindLength,
							match = match[0].slice(lookbehindLength),
							len = match.length,
							to = from + len,
							before = str.slice(0, from + 1),
							after = str.slice(to + 1);

						var args = [i, 1];

						if (before) {
							args.push(before);
						}

						var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias);

						args.push(wrapped);

						if (after) {
							args.push(after);
						}

						Array.prototype.splice.apply(strarr, args);
					}
				}
			}
		}

		return strarr;
	},

	hooks: {
		all: {},

		add: function (name, callback) {
			var hooks = _.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		run: function (name, env) {
			var callbacks = _.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (var i=0, callback; callback = callbacks[i++];) {
				callback(env);
			}
		}
	}
};

var Token = _.Token = function(type, content, alias) {
	this.type = type;
	this.content = content;
	this.alias = alias;
};

Token.stringify = function(o, language, parent) {
	if (typeof o == 'string') {
		return o;
	}

	if (_.util.type(o) === 'Array') {
		return o.map(function(element) {
			return Token.stringify(element, language, o);
		}).join('');
	}

	var env = {
		type: o.type,
		content: Token.stringify(o.content, language, parent),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language,
		parent: parent
	};

	if (env.type == 'comment') {
		env.attributes['spellcheck'] = 'true';
	}

	if (o.alias) {
		var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
		Array.prototype.push.apply(env.classes, aliases);
	}

	_.hooks.run('wrap', env);

	var attributes = '';

	for (var name in env.attributes) {
		attributes += (attributes ? ' ' : '') + name + '="' + (env.attributes[name] || '') + '"';
	}

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';

};

if (!_self.document) {
	if (!_self.addEventListener) {
		// in Node.js
		return _self.Prism;
	}
 	// In worker
	_self.addEventListener('message', function(evt) {
		var message = JSON.parse(evt.data),
		    lang = message.language,
		    code = message.code,
		    immediateClose = message.immediateClose;

		_self.postMessage(_.highlight(code, _.languages[lang], lang));
		if (immediateClose) {
			_self.close();
		}
	}, false);

	return _self.Prism;
}

// Get current script and highlight
var script = document.getElementsByTagName('script');

script = script[script.length - 1];

if (script) {
	_.filename = script.src;

	if (document.addEventListener && !script.hasAttribute('data-manual')) {
		document.addEventListener('DOMContentLoaded', _.highlightAll);
	}
}

return _self.Prism;

})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
	global.Prism = Prism;
}


/* **********************************************
     Begin prism-markup.js
********************************************** */

Prism.languages.markup = {
	'comment': /<!--[\w\W]*?-->/,
	'prolog': /<\?[\w\W]+?\?>/,
	'doctype': /<!DOCTYPE[\w\W]+?>/,
	'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=.$<]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\\1|\\?(?!\1)[\w\W])*\1|[^\s'">=]+))?)*\s*\/?>/i,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/i,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'attr-value': {
				pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
				inside: {
					'punctuation': /[=>"']/
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': /&#?[\da-z]{1,8};/i
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;


/* **********************************************
     Begin prism-css.js
********************************************** */

Prism.languages.css = {
	'comment': /\/\*[\w\W]*?\*\//,
	'atrule': {
		pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
		inside: {
			'rule': /@[\w-]+/
			// See rest below
		}
	},
	'url': /url\((?:(["'])(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
	'selector': /[^\{\}\s][^\{\};]*?(?=\s*\{)/,
	'string': /("|')(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1/,
	'property': /(\b|\B)[\w-]+(?=\s*:)/i,
	'important': /\B!important\b/i,
	'function': /[-a-z0-9]+(?=\()/i,
	'punctuation': /[(){};:]/
};

Prism.languages.css['atrule'].inside.rest = Prism.util.clone(Prism.languages.css);

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'style': {
			pattern: /(<style[\w\W]*?>)[\w\W]*?(?=<\/style>)/i,
			lookbehind: true,
			inside: Prism.languages.css,
			alias: 'language-css'
		}
	});
	
	Prism.languages.insertBefore('inside', 'attr-value', {
		'style-attr': {
			pattern: /\s*style=("|').*?\1/i,
			inside: {
				'attr-name': {
					pattern: /^\s*style/i,
					inside: Prism.languages.markup.tag.inside
				},
				'punctuation': /^\s*=\s*['"]|['"]\s*$/,
				'attr-value': {
					pattern: /.+/i,
					inside: Prism.languages.css
				}
			},
			alias: 'language-css'
		}
	}, Prism.languages.markup.tag);
}

/* **********************************************
     Begin prism-clike.js
********************************************** */

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*/,
			lookbehind: true
		}
	],
	'string': /(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
	'class-name': {
		pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
		lookbehind: true,
		inside: {
			punctuation: /(\.|\\)/
		}
	},
	'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
	'boolean': /\b(true|false)\b/,
	'function': /[a-z0-9_]+(?=\()/i,
	'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
	'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
	'punctuation': /[{}[\];(),.:]/
};


/* **********************************************
     Begin prism-javascript.js
********************************************** */

Prism.languages.javascript = Prism.languages.extend('clike', {
	'keyword': /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/,
	'number': /\b-?(0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|Infinity)\b/,
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\()/i
});

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\\\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})]))/,
		lookbehind: true
	}
});

Prism.languages.insertBefore('javascript', 'class-name', {
	'template-string': {
		pattern: /`(?:\\`|\\?[^`])*`/,
		inside: {
			'interpolation': {
				pattern: /\$\{[^}]+\}/,
				inside: {
					'interpolation-punctuation': {
						pattern: /^\$\{|\}$/,
						alias: 'punctuation'
					},
					rest: Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	}
});

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'script': {
			pattern: /(<script[\w\W]*?>)[\w\W]*?(?=<\/script>)/i,
			lookbehind: true,
			inside: Prism.languages.javascript,
			alias: 'language-javascript'
		}
	});
}

Prism.languages.js = Prism.languages.javascript;

/* **********************************************
     Begin prism-file-highlight.js
********************************************** */

(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
		return;
	}

	self.Prism.fileHighlight = function() {

		var Extensions = {
			'js': 'javascript',
			'html': 'markup',
			'svg': 'markup',
			'xml': 'markup',
			'py': 'python',
			'rb': 'ruby',
			'ps1': 'powershell',
			'psm1': 'powershell'
		};

		if(Array.prototype.forEach) { // Check to prevent error in IE8
			Array.prototype.slice.call(document.querySelectorAll('pre[data-src]')).forEach(function (pre) {
				var src = pre.getAttribute('data-src');

				var language, parent = pre;
				var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;
				while (parent && !lang.test(parent.className)) {
					parent = parent.parentNode;
				}

				if (parent) {
					language = (pre.className.match(lang) || [, ''])[1];
				}

				if (!language) {
					var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
					language = Extensions[extension] || extension;
				}

				var code = document.createElement('code');
				code.className = 'language-' + language;

				pre.textContent = '';

				code.textContent = 'Loading…';

				pre.appendChild(code);

				var xhr = new XMLHttpRequest();

				xhr.open('GET', src, true);

				xhr.onreadystatechange = function () {
					if (xhr.readyState == 4) {

						if (xhr.status < 400 && xhr.responseText) {
							code.textContent = xhr.responseText;

							Prism.highlightElement(code);
						}
						else if (xhr.status >= 400) {
							code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
						}
						else {
							code.textContent = '✖ Error: File does not exist or is empty';
						}
					}
				};

				xhr.send(null);
			});
		}

	};

	self.Prism.fileHighlight();

})();
(function() {

  'use strict';

  var HIGHLIGHT_EVENT = 'syntax-highlight';

  Polymer({

    is: 'prism-highlighter',

    ready: function() {
      this._handler = this._highlight.bind(this);
    },

    attached: function() {
      (this.parentElement || this.parentNode.host).addEventListener(HIGHLIGHT_EVENT, this._handler);
    },

    detached: function() {
      (this.parentElement || this.parentNode.host).removeEventListener(HIGHLIGHT_EVENT, this._handler);
    },

    /**
     * Handle the highlighting event, if we can.
     *
     * @param {!CustomEvent} event
     */
    _highlight: function(event) {
      if (!event.detail || !event.detail.code) {
        console.warn('Malformed', HIGHLIGHT_EVENT, 'event:', event.detail);
        return;
      }

      var detail = event.detail;
      detail.code = Prism.highlight(detail.code, this._detectLang(detail.code, detail.lang));
    },

    /**
     * Picks a Prism formatter based on the `lang` hint and `code`.
     *
     * @param {string} code The source being highlighted.
     * @param {string=} lang A language hint (e.g. ````LANG`).
     * @return {!prism.Lang}
     */
    _detectLang: function(code, lang) {
      if (!lang) {
        // Stupid simple detection if we have no lang, courtesy of:
        // https://github.com/robdodson/mark-down/blob/ac2eaa/mark-down.html#L93-101
        return code.match(/^\s*</) ? Prism.languages.markup : Prism.languages.javascript;
      }

      if (lang === 'js' || lang.substr(0, 2) === 'es') {
        return Prism.languages.javascript;
      } else if (lang === 'css') {
        return Prism.languages.css;
      } else if (lang === 'c') {
        return Prism.languages.clike;
      } else {
        // The assumption is that you're mostly documenting HTML when in HTML.
        return Prism.languages.markup;
      }
    },

  });

})();
/**
   * `IronResizableBehavior` is a behavior that can be used in Polymer elements to
   * coordinate the flow of resize events between "resizers" (elements that control the
   * size or hidden state of their children) and "resizables" (elements that need to be
   * notified when they are resized or un-hidden by their parents in order to take
   * action on their new measurements).
   * Elements that perform measurement should add the `IronResizableBehavior` behavior to
   * their element definition and listen for the `iron-resize` event on themselves.
   * This event will be fired when they become showing after having been hidden,
   * when they are resized explicitly by another resizable, or when the window has been
   * resized.
   * Note, the `iron-resize` event is non-bubbling.
   *
   * @polymerBehavior Polymer.IronResizableBehavior
   * @demo demo/index.html
   **/
  Polymer.IronResizableBehavior = {
    properties: {
      /**
       * The closest ancestor element that implements `IronResizableBehavior`.
       */
      _parentResizable: {
        type: Object,
        observer: '_parentResizableChanged'
      },

      /**
       * True if this element is currently notifying its descedant elements of
       * resize.
       */
      _notifyingDescendant: {
        type: Boolean,
        value: false
      }
    },

    listeners: {
      'iron-request-resize-notifications': '_onIronRequestResizeNotifications'
    },

    created: function() {
      // We don't really need property effects on these, and also we want them
      // to be created before the `_parentResizable` observer fires:
      this._interestedResizables = [];
      this._boundNotifyResize = this.notifyResize.bind(this);
    },

    attached: function() {
      this.fire('iron-request-resize-notifications', null, {
        node: this,
        bubbles: true,
        cancelable: true
      });

      if (!this._parentResizable) {
        window.addEventListener('resize', this._boundNotifyResize);
        this.notifyResize();
      }
    },

    detached: function() {
      if (this._parentResizable) {
        this._parentResizable.stopResizeNotificationsFor(this);
      } else {
        window.removeEventListener('resize', this._boundNotifyResize);
      }

      this._parentResizable = null;
    },

    /**
     * Can be called to manually notify a resizable and its descendant
     * resizables of a resize change.
     */
    notifyResize: function() {
      if (!this.isAttached) {
        return;
      }

      this._interestedResizables.forEach(function(resizable) {
        if (this.resizerShouldNotify(resizable)) {
          this._notifyDescendant(resizable);
        }
      }, this);

      this._fireResize();
    },

    /**
     * Used to assign the closest resizable ancestor to this resizable
     * if the ancestor detects a request for notifications.
     */
    assignParentResizable: function(parentResizable) {
      this._parentResizable = parentResizable;
    },

    /**
     * Used to remove a resizable descendant from the list of descendants
     * that should be notified of a resize change.
     */
    stopResizeNotificationsFor: function(target) {
      var index = this._interestedResizables.indexOf(target);

      if (index > -1) {
        this._interestedResizables.splice(index, 1);
        this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
      }
    },

    /**
     * This method can be overridden to filter nested elements that should or
     * should not be notified by the current element. Return true if an element
     * should be notified, or false if it should not be notified.
     *
     * @param {HTMLElement} element A candidate descendant element that
     * implements `IronResizableBehavior`.
     * @return {boolean} True if the `element` should be notified of resize.
     */
    resizerShouldNotify: function(element) { return true; },

    _onDescendantIronResize: function(event) {
      if (this._notifyingDescendant) {
        event.stopPropagation();
        return;
      }

      // NOTE(cdata): In ShadowDOM, event retargetting makes echoing of the
      // otherwise non-bubbling event "just work." We do it manually here for
      // the case where Polymer is not using shadow roots for whatever reason:
      if (!Polymer.Settings.useShadow) {
        this._fireResize();
      }
    },

    _fireResize: function() {
      this.fire('iron-resize', null, {
        node: this,
        bubbles: false
      });
    },

    _onIronRequestResizeNotifications: function(event) {
      var target = event.path ? event.path[0] : event.target;

      if (target === this) {
        return;
      }

      if (this._interestedResizables.indexOf(target) === -1) {
        this._interestedResizables.push(target);
        this.listen(target, 'iron-resize', '_onDescendantIronResize');
      }

      target.assignParentResizable(this);
      this._notifyDescendant(target);

      event.stopPropagation();
    },

    _parentResizableChanged: function(parentResizable) {
      if (parentResizable) {
        window.removeEventListener('resize', this._boundNotifyResize);
      }
    },

    _notifyDescendant: function(descendant) {
      // NOTE(cdata): In IE10, attached is fired on children first, so it's
      // important not to notify them if the parent is not attached yet (or
      // else they will get redundantly notified when the parent attaches).
      if (!this.isAttached) {
        return;
      }

      this._notifyingDescendant = true;
      descendant.notifyResize();
      this._notifyingDescendant = false;
    }
  };
/**
Polymer.IronFitBehavior fits an element in another element using `max-height` and `max-width`, and
optionally centers it in the window or another element.

The element will only be sized and/or positioned if it has not already been sized and/or positioned
by CSS.

CSS properties               | Action
-----------------------------|-------------------------------------------
`position` set               | Element is not centered horizontally or vertically
`top` or `bottom` set        | Element is not vertically centered
`left` or `right` set        | Element is not horizontally centered
`max-height` or `height` set | Element respects `max-height` or `height`
`max-width` or `width` set   | Element respects `max-width` or `width`

@demo demo/index.html
@polymerBehavior
*/

  Polymer.IronFitBehavior = {

    properties: {

      /**
       * The element that will receive a `max-height`/`width`. By default it is the same as `this`,
       * but it can be set to a child element. This is useful, for example, for implementing a
       * scrolling region inside the element.
       * @type {!Element}
       */
      sizingTarget: {
        type: Object,
        value: function() {
          return this;
        }
      },

      /**
       * The element to fit `this` into.
       */
      fitInto: {
        type: Object,
        value: window
      },

      /**
       * Set to true to auto-fit on attach.
       */
      autoFitOnAttach: {
        type: Boolean,
        value: false
      },

      /** @type {?Object} */
      _fitInfo: {
        type: Object
      }

    },

    get _fitWidth() {
      var fitWidth;
      if (this.fitInto === window) {
        fitWidth = this.fitInto.innerWidth;
      } else {
        fitWidth = this.fitInto.getBoundingClientRect().width;
      }
      return fitWidth;
    },

    get _fitHeight() {
      var fitHeight;
      if (this.fitInto === window) {
        fitHeight = this.fitInto.innerHeight;
      } else {
        fitHeight = this.fitInto.getBoundingClientRect().height;
      }
      return fitHeight;
    },

    get _fitLeft() {
      var fitLeft;
      if (this.fitInto === window) {
        fitLeft = 0;
      } else {
        fitLeft = this.fitInto.getBoundingClientRect().left;
      }
      return fitLeft;
    },

    get _fitTop() {
      var fitTop;
      if (this.fitInto === window) {
        fitTop = 0;
      } else {
        fitTop = this.fitInto.getBoundingClientRect().top;
      }
      return fitTop;
    },

    attached: function() {
      if (this.autoFitOnAttach) {
        if (window.getComputedStyle(this).display === 'none') {
          setTimeout(function() {
            this.fit();
          }.bind(this));
        } else {
          this.fit();
        }
      }
    },

    /**
     * Fits and optionally centers the element into the window, or `fitInfo` if specified.
     */
    fit: function() {
      this._discoverInfo();
      this.constrain();
      this.center();
    },

    /**
     * Memoize information needed to position and size the target element.
     */
    _discoverInfo: function() {
      if (this._fitInfo) {
        return;
      }
      var target = window.getComputedStyle(this);
      var sizer = window.getComputedStyle(this.sizingTarget);
      this._fitInfo = {
        inlineStyle: {
          top: this.style.top || '',
          left: this.style.left || ''
        },
        positionedBy: {
          vertically: target.top !== 'auto' ? 'top' : (target.bottom !== 'auto' ?
            'bottom' : null),
          horizontally: target.left !== 'auto' ? 'left' : (target.right !== 'auto' ?
            'right' : null),
          css: target.position
        },
        sizedBy: {
          height: sizer.maxHeight !== 'none',
          width: sizer.maxWidth !== 'none'
        },
        margin: {
          top: parseInt(target.marginTop, 10) || 0,
          right: parseInt(target.marginRight, 10) || 0,
          bottom: parseInt(target.marginBottom, 10) || 0,
          left: parseInt(target.marginLeft, 10) || 0
        }
      };
    },

    /**
     * Resets the target element's position and size constraints, and clear
     * the memoized data.
     */
    resetFit: function() {
      if (!this._fitInfo || !this._fitInfo.sizedBy.height) {
        this.sizingTarget.style.maxHeight = '';
        this.style.top = this._fitInfo ? this._fitInfo.inlineStyle.top : '';
      }
      if (!this._fitInfo || !this._fitInfo.sizedBy.width) {
        this.sizingTarget.style.maxWidth = '';
        this.style.left = this._fitInfo ? this._fitInfo.inlineStyle.left : '';
      }
      if (this._fitInfo) {
        this.style.position = this._fitInfo.positionedBy.css;
      }
      this._fitInfo = null;
    },

    /**
     * Equivalent to calling `resetFit()` and `fit()`. Useful to call this after the element,
     * the window, or the `fitInfo` element has been resized.
     */
    refit: function() {
      this.resetFit();
      this.fit();
    },

    /**
     * Constrains the size of the element to the window or `fitInfo` by setting `max-height`
     * and/or `max-width`.
     */
    constrain: function() {
      var info = this._fitInfo;
      // position at (0px, 0px) if not already positioned, so we can measure the natural size.
      if (!this._fitInfo.positionedBy.vertically) {
        this.style.top = '0px';
      }
      if (!this._fitInfo.positionedBy.horizontally) {
        this.style.left = '0px';
      }
      if (!this._fitInfo.positionedBy.vertically || !this._fitInfo.positionedBy.horizontally) {
        // need position:fixed to properly size the element
        this.style.position = 'fixed';
      }
      // need border-box for margin/padding
      this.sizingTarget.style.boxSizing = 'border-box';
      // constrain the width and height if not already set
      var rect = this.getBoundingClientRect();
      if (!info.sizedBy.height) {
        this._sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
      }
      if (!info.sizedBy.width) {
        this._sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
      }
    },

    _sizeDimension: function(rect, positionedBy, start, end, extent) {
      var info = this._fitInfo;
      var max = extent === 'Width' ? this._fitWidth : this._fitHeight;
      var flip = (positionedBy === end);
      var offset = flip ? max - rect[end] : rect[start];
      var margin = info.margin[flip ? start : end];
      var offsetExtent = 'offset' + extent;
      var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
      this.sizingTarget.style['max' + extent] = (max - margin - offset - sizingOffset) + 'px';
    },

    /**
     * Centers horizontally and vertically if not already positioned. This also sets
     * `position:fixed`.
     */
    center: function() {
      if (!this._fitInfo.positionedBy.vertically || !this._fitInfo.positionedBy.horizontally) {
        // need position:fixed to center
        this.style.position = 'fixed';
      }
      if (!this._fitInfo.positionedBy.vertically) {
        var top = (this._fitHeight - this.offsetHeight) / 2 + this._fitTop;
        top -= this._fitInfo.margin.top;
        this.style.top = top + 'px';
      }
      if (!this._fitInfo.positionedBy.horizontally) {
        var left = (this._fitWidth - this.offsetWidth) / 2 + this._fitLeft;
        left -= this._fitInfo.margin.left;
        this.style.left = left + 'px';
      }
    }

  };
Polymer.IronOverlayManager = (function() {

    var overlays = [];
    var DEFAULT_Z = 10;
    var backdrops = [];

    // track overlays for z-index and focus managemant
    function addOverlay(overlay) {
      var z0 = currentOverlayZ();
      overlays.push(overlay);
      var z1 = currentOverlayZ();
      if (z1 <= z0) {
        applyOverlayZ(overlay, z0);
      }
    }

    function removeOverlay(overlay) {
      var i = overlays.indexOf(overlay);
      if (i >= 0) {
        overlays.splice(i, 1);
        setZ(overlay, '');
      }
    }

    function applyOverlayZ(overlay, aboveZ) {
      setZ(overlay, aboveZ + 2);
    }

    function setZ(element, z) {
      element.style.zIndex = z;
    }

    function currentOverlay() {
      var i = overlays.length - 1;
      while (overlays[i] && !overlays[i].opened) {
        --i;
      }
      return overlays[i];
    }

    function currentOverlayZ() {
      var z;
      var current = currentOverlay();
      if (current) {
        var z1 = window.getComputedStyle(current).zIndex;
        if (!isNaN(z1)) {
          z = Number(z1);
        }
      }
      return z || DEFAULT_Z;
    }

    function focusOverlay() {
      var current = currentOverlay();
      // We have to be careful to focus the next overlay _after_ any current
      // transitions are complete (due to the state being toggled prior to the
      // transition). Otherwise, we risk infinite recursion when a transitioning
      // (closed) overlay becomes the current overlay.
      //
      // NOTE: We make the assumption that any overlay that completes a transition
      // will call into focusOverlay to kick the process back off. Currently:
      // transitionend -> _applyFocus -> focusOverlay.
      if (current && !current.transitioning) {
        current._applyFocus();
      }
    }

    function trackBackdrop(element) {
      // backdrops contains the overlays with a backdrop that are currently
      // visible
      if (element.opened) {
        backdrops.push(element);
      } else {
        var index = backdrops.indexOf(element);
        if (index >= 0) {
          backdrops.splice(index, 1);
        }
      }
    }

    function getBackdrops() {
      return backdrops;
    }

    return {
      addOverlay: addOverlay,
      removeOverlay: removeOverlay,
      currentOverlay: currentOverlay,
      currentOverlayZ: currentOverlayZ,
      focusOverlay: focusOverlay,
      trackBackdrop: trackBackdrop,
      getBackdrops: getBackdrops
    };

  })();
/**
Use `Polymer.IronOverlayBehavior` to implement an element that can be hidden or shown, and displays
on top of other content. It includes an optional backdrop, and can be used to implement a variety
of UI controls including dialogs and drop downs. Multiple overlays may be displayed at once.

### Closing and canceling

A dialog may be hidden by closing or canceling. The difference between close and cancel is user
intent. Closing generally implies that the user acknowledged the content on the overlay. By default,
it will cancel whenever the user taps outside it or presses the escape key. This behavior is
configurable with the `no-cancel-on-esc-key` and the `no-cancel-on-outside-click` properties.
`close()` should be called explicitly by the implementer when the user interacts with a control
in the overlay element. When the dialog is canceled, the overlay fires an 'iron-overlay-canceled'
event. Call `preventDefault` on this event to prevent the overlay from closing.

### Positioning

By default the element is sized and positioned to fit and centered inside the window. You can
position and size it manually using CSS. See `Polymer.IronFitBehavior`.

### Backdrop

Set the `with-backdrop` attribute to display a backdrop behind the overlay. The backdrop is
appended to `<body>` and is of type `<iron-overlay-backdrop>`. See its doc page for styling
options.

### Limitations

The element is styled to appear on top of other content by setting its `z-index` property. You
must ensure no element has a stacking context with a higher `z-index` than its parent stacking
context. You should place this element as a child of `<body>` whenever possible.

@demo demo/index.html
@polymerBehavior Polymer.IronOverlayBehavior
*/

  Polymer.IronOverlayBehaviorImpl = {

    properties: {

      /**
       * True if the overlay is currently displayed.
       */
      opened: {
        observer: '_openedChanged',
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * True if the overlay was canceled when it was last closed.
       */
      canceled: {
        observer: '_canceledChanged',
        readOnly: true,
        type: Boolean,
        value: false
      },

      /**
       * Set to true to display a backdrop behind the overlay.
       */
      withBackdrop: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable auto-focusing the overlay or child nodes with
       * the `autofocus` attribute` when the overlay is opened.
       */
      noAutoFocus: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay with the ESC key.
       */
      noCancelOnEscKey: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay by clicking outside it.
       */
      noCancelOnOutsideClick: {
        type: Boolean,
        value: false
      },

      /**
       * Returns the reason this dialog was last closed.
       */
      closingReason: {
        // was a getter before, but needs to be a property so other
        // behaviors can override this.
        type: Object
      },

      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      },

      _boundOnCaptureClick: {
        type: Function,
        value: function() {
          return this._onCaptureClick.bind(this);
        }
      },

      _boundOnCaptureKeydown: {
        type: Function,
        value: function() {
          return this._onCaptureKeydown.bind(this);
        }
      }

    },

    listeners: {
      'tap': '_onClick',
      'iron-resize': '_onIronResize'
    },

    /**
     * The backdrop element.
     * @type Node
     */
    get backdropElement() {
      return this._backdrop;
    },

    get _focusNode() {
      return Polymer.dom(this).querySelector('[autofocus]') || this;
    },

    registered: function() {
      this._backdrop = document.createElement('iron-overlay-backdrop');
    },

    ready: function() {
      this._ensureSetup();
      if (this._callOpenedWhenReady) {
        this._openedChanged();
      }
    },

    detached: function() {
      this.opened = false;
      this._completeBackdrop();
      this._manager.removeOverlay(this);
    },

    /**
     * Toggle the opened state of the overlay.
     */
    toggle: function() {
      this.opened = !this.opened;
    },

    /**
     * Open the overlay.
     */
    open: function() {
      this.opened = true;
      this.closingReason = {canceled: false};
    },

    /**
     * Close the overlay.
     */
    close: function() {
      this.opened = false;
      this._setCanceled(false);
    },

    /**
     * Cancels the overlay.
     */
    cancel: function() {
      var cancelEvent = this.fire('iron-overlay-canceled', undefined, {cancelable: true});
      if (cancelEvent.defaultPrevented) {
        return;
      }

      this.opened = false;
      this._setCanceled(true);
    },

    _ensureSetup: function() {
      if (this._overlaySetup) {
        return;
      }
      this._overlaySetup = true;
      this.style.outline = 'none';
      this.style.display = 'none';
    },

    _openedChanged: function() {
      if (this.opened) {
        this.removeAttribute('aria-hidden');
      } else {
        this.setAttribute('aria-hidden', 'true');
      }

      // wait to call after ready only if we're initially open
      if (!this._overlaySetup) {
        this._callOpenedWhenReady = this.opened;
        return;
      }
      if (this._openChangedAsync) {
        this.cancelAsync(this._openChangedAsync);
      }

      this._toggleListeners();

      if (this.opened) {
        this._prepareRenderOpened();
      }

      // async here to allow overlay layer to become visible.
      this._openChangedAsync = this.async(function() {
        // overlay becomes visible here
        this.style.display = '';
        // force layout to ensure transitions will go
        /** @suppress {suspiciousCode} */ this.offsetWidth;
        if (this.opened) {
          this._renderOpened();
        } else {
          this._renderClosed();
        }
        this._openChangedAsync = null;
      });

    },

    _canceledChanged: function() {
      this.closingReason = this.closingReason || {};
      this.closingReason.canceled = this.canceled;
    },

    _toggleListener: function(enable, node, event, boundListener, capture) {
      if (enable) {
        // enable document-wide tap recognizer
        if (event === 'tap') {
          Polymer.Gestures.add(document, 'tap', null);
        }
        node.addEventListener(event, boundListener, capture);
      } else {
        // disable document-wide tap recognizer
        if (event === 'tap') {
          Polymer.Gestures.remove(document, 'tap', null);
        }
        node.removeEventListener(event, boundListener, capture);
      }
    },

    _toggleListeners: function() {
      if (this._toggleListenersAsync) {
        this.cancelAsync(this._toggleListenersAsync);
      }
      // async so we don't auto-close immediately via a click.
      this._toggleListenersAsync = this.async(function() {
        this._toggleListener(this.opened, document, 'tap', this._boundOnCaptureClick, true);
        this._toggleListener(this.opened, document, 'keydown', this._boundOnCaptureKeydown, true);
        this._toggleListenersAsync = null;
      }, 1);
    },

    // tasks which must occur before opening; e.g. making the element visible
    _prepareRenderOpened: function() {
      this._manager.addOverlay(this);

      if (this.withBackdrop) {
        this.backdropElement.prepare();
        this._manager.trackBackdrop(this);
      }

      this._preparePositioning();
      this.fit();
      this._finishPositioning();
    },

    // tasks which cause the overlay to actually open; typically play an
    // animation
    _renderOpened: function() {
      if (this.withBackdrop) {
        this.backdropElement.open();
      }
      this._finishRenderOpened();
    },

    _renderClosed: function() {
      if (this.withBackdrop) {
        this.backdropElement.close();
      }
      this._finishRenderClosed();
    },

    _onTransitionend: function(event) {
      // make sure this is our transition event.
      if (event && event.target !== this) {
        return;
      }
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    },

    _finishRenderOpened: function() {
      // focus the child node with [autofocus]
      if (!this.noAutoFocus) {
        this._focusNode.focus();
      }

      this.fire('iron-overlay-opened');

      this._squelchNextResize = true;
      this.async(this.notifyResize);
    },

    _finishRenderClosed: function() {
      // hide the overlay and remove the backdrop
      this.resetFit();
      this.style.display = 'none';
      this._completeBackdrop();
      this._manager.removeOverlay(this);

      this._focusNode.blur();
      // focus the next overlay, if there is one
      this._manager.focusOverlay();

      this.fire('iron-overlay-closed', this.closingReason);

      this._squelchNextResize = true;
      this.async(this.notifyResize);
    },

    _completeBackdrop: function() {
      if (this.withBackdrop) {
        this._manager.trackBackdrop(this);
        this.backdropElement.complete();
      }
    },

    _preparePositioning: function() {
      this.style.transition = this.style.webkitTransition = 'none';
      this.style.transform = this.style.webkitTransform = 'none';
      this.style.display = '';
    },

    _finishPositioning: function() {
      this.style.display = 'none';
      this.style.transform = this.style.webkitTransform = '';
      // force layout to avoid application of transform
      /** @suppress {suspiciousCode} */ this.offsetWidth;
      this.style.transition = this.style.webkitTransition = '';
    },

    _applyFocus: function() {
      if (this.opened) {
        if (!this.noAutoFocus) {
          this._focusNode.focus();
        }
      } else {
        this._focusNode.blur();
        this._manager.focusOverlay();
      }
    },

    _onCaptureClick: function(event) {
      // attempt to close asynchronously and prevent the close of a tap event is immediately heard
      // on target. This is because in shadow dom due to event retargetting event.target is not
      // useful.
      if (!this.noCancelOnOutsideClick && (this._manager.currentOverlay() == this)) {
        this._cancelJob = this.async(function() {
          this.cancel();
        }, 10);
      }
    },

    _onClick: function(event) {
      if (this._cancelJob) {
        this.cancelAsync(this._cancelJob);
        this._cancelJob = null;
      }
    },

    _onCaptureKeydown: function(event) {
      var ESC = 27;
      if (!this.noCancelOnEscKey && (event.keyCode === ESC)) {
        this.cancel();
        event.stopPropagation();
      }
    },

    _onIronResize: function() {
      if (this._squelchNextResize) {
        this._squelchNextResize = false;
        return;
      }
      if (this.opened) {
        this.refit();
      }
    }

/**
 * Fired after the `iron-overlay` opens.
 * @event iron-overlay-opened
 */

/**
 * Fired after the `iron-overlay` closes.
 * @event iron-overlay-closed
 * @param {{canceled: (boolean|undefined)}} set to the `closingReason` attribute
 */
  };

  /** @polymerBehavior */
  Polymer.IronOverlayBehavior = [Polymer.IronFitBehavior, Polymer.IronResizableBehavior, Polymer.IronOverlayBehaviorImpl];
/**
   * Use `Polymer.NeonAnimationBehavior` to implement an animation.
   * @polymerBehavior
   */
  Polymer.NeonAnimationBehavior = {

    properties: {

      /**
       * Defines the animation timing.
       */
      animationTiming: {
        type: Object,
        value: function() {
          return {
            duration: 500,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'both'
          }
        }
      }

    },

    registered: function() {
      new Polymer.IronMeta({type: 'animation', key: this.is, value: this.constructor});
    },

    /**
     * Do any animation configuration here.
     */
    // configure: function(config) {
    // },

    /**
     * Returns the animation timing by mixing in properties from `config` to the defaults defined
     * by the animation.
     */
    timingFromConfig: function(config) {
      if (config.timing) {
        for (var property in config.timing) {
          this.animationTiming[property] = config.timing[property];
        }
      }
      return this.animationTiming;
    },

    /**
     * Sets `transform` and `transformOrigin` properties along with the prefixed versions.
     */
    setPrefixedProperty: function(node, property, value) {
      var map = {
        'transform': ['webkitTransform'],
        'transformOrigin': ['mozTransformOrigin', 'webkitTransformOrigin']
      };
      var prefixes = map[property];
      for (var prefix, index = 0; prefix = prefixes[index]; index++) {
        node.style[prefix] = value;
      }
      node.style[property] = value;
    },

    /**
     * Called when the animation finishes.
     */
    complete: function() {}

  };
// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

!function(a,b){b["true"]=a;var c={},d={},e={},f=null;!function(a){function b(a){if("number"==typeof a)return a;var b={};for(var c in a)b[c]=a[c];return b}function c(){this._delay=0,this._endDelay=0,this._fill="none",this._iterationStart=0,this._iterations=1,this._duration=0,this._playbackRate=1,this._direction="normal",this._easing="linear"}function d(b,d){var e=new c;return d&&(e.fill="both",e.duration="auto"),"number"!=typeof b||isNaN(b)?void 0!==b&&Object.getOwnPropertyNames(b).forEach(function(c){if("auto"!=b[c]){if(("number"==typeof e[c]||"duration"==c)&&("number"!=typeof b[c]||isNaN(b[c])))return;if("fill"==c&&-1==s.indexOf(b[c]))return;if("direction"==c&&-1==t.indexOf(b[c]))return;if("playbackRate"==c&&1!==b[c]&&a.isDeprecated("AnimationEffectTiming.playbackRate","2014-11-28","Use Animation.playbackRate instead."))return;e[c]=b[c]}}):e.duration=b,e}function e(a){return"number"==typeof a&&(a=isNaN(a)?{duration:0}:{duration:a}),a}function f(b,c){b=a.numericTimingToObject(b);var e=d(b,c);return e._easing=i(e.easing),e}function g(a,b,c,d){return 0>a||a>1||0>c||c>1?B:function(e){function f(a,b,c){return 3*a*(1-c)*(1-c)*c+3*b*(1-c)*c*c+c*c*c}if(0==e||1==e)return e;for(var g=0,h=1;;){var i=(g+h)/2,j=f(a,c,i);if(Math.abs(e-j)<.001)return f(b,d,i);e>j?g=i:h=i}}}function h(a,b){return function(c){if(c>=1)return 1;var d=1/a;return c+=b*d,c-c%d}}function i(a){var b=z.exec(a);if(b)return g.apply(this,b.slice(1).map(Number));var c=A.exec(a);if(c)return h(Number(c[1]),{start:u,middle:v,end:w}[c[2]]);var d=x[a];return d?d:B}function j(a){return Math.abs(k(a)/a.playbackRate)}function k(a){return a.duration*a.iterations}function l(a,b,c){return null==b?C:b<c.delay?D:b>=c.delay+a?E:F}function m(a,b,c,d,e){switch(d){case D:return"backwards"==b||"both"==b?0:null;case F:return c-e;case E:return"forwards"==b||"both"==b?a:null;case C:return null}}function n(a,b,c,d){return(d.playbackRate<0?b-a:b)*d.playbackRate+c}function o(a,b,c,d,e){return 1/0===c||c===-1/0||c-d==b&&e.iterations&&(e.iterations+e.iterationStart)%1==0?a:c%a}function p(a,b,c,d){return 0===c?0:b==a?d.iterationStart+d.iterations-1:Math.floor(c/a)}function q(a,b,c,d){var e=a%2>=1,f="normal"==d.direction||d.direction==(e?"alternate-reverse":"alternate"),g=f?c:b-c,h=g/b;return b*d.easing(h)}function r(a,b,c){var d=l(a,b,c),e=m(a,c.fill,b,d,c.delay);if(null===e)return null;if(0===a)return d===D?0:1;var f=c.iterationStart*c.duration,g=n(a,e,f,c),h=o(c.duration,k(c),g,f,c),i=p(c.duration,h,g,c);return q(i,c.duration,h,c)/c.duration}var s="backwards|forwards|both|none".split("|"),t="reverse|alternate|alternate-reverse".split("|");c.prototype={_setMember:function(b,c){this["_"+b]=c,this._effect&&(this._effect._timingInput[b]=c,this._effect._timing=a.normalizeTimingInput(a.normalizeTimingInput(this._effect._timingInput)),this._effect.activeDuration=a.calculateActiveDuration(this._effect._timing),this._effect._animation&&this._effect._animation._rebuildUnderlyingAnimation())},get playbackRate(){return this._playbackRate},set delay(a){this._setMember("delay",a)},get delay(){return this._delay},set endDelay(a){this._setMember("endDelay",a)},get endDelay(){return this._endDelay},set fill(a){this._setMember("fill",a)},get fill(){return this._fill},set iterationStart(a){this._setMember("iterationStart",a)},get iterationStart(){return this._iterationStart},set duration(a){this._setMember("duration",a)},get duration(){return this._duration},set direction(a){this._setMember("direction",a)},get direction(){return this._direction},set easing(a){this._setMember("easing",a)},get easing(){return this._easing},set iterations(a){this._setMember("iterations",a)},get iterations(){return this._iterations}};var u=1,v=.5,w=0,x={ease:g(.25,.1,.25,1),"ease-in":g(.42,0,1,1),"ease-out":g(0,0,.58,1),"ease-in-out":g(.42,0,.58,1),"step-start":h(1,u),"step-middle":h(1,v),"step-end":h(1,w)},y="\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*",z=new RegExp("cubic-bezier\\("+y+","+y+","+y+","+y+"\\)"),A=/steps\(\s*(\d+)\s*,\s*(start|middle|end)\s*\)/,B=function(a){return a},C=0,D=1,E=2,F=3;a.cloneTimingInput=b,a.makeTiming=d,a.numericTimingToObject=e,a.normalizeTimingInput=f,a.calculateActiveDuration=j,a.calculateTimeFraction=r,a.calculatePhase=l,a.toTimingFunction=i}(c,f),function(a){function b(a,b){return a in h?h[a][b]||b:b}function c(a,c,d){var g=e[a];if(g){f.style[a]=c;for(var h in g){var i=g[h],j=f.style[i];d[i]=b(i,j)}}else d[a]=b(a,c)}function d(b){function d(){var a=e.length;null==e[a-1].offset&&(e[a-1].offset=1),a>1&&null==e[0].offset&&(e[0].offset=0);for(var b=0,c=e[0].offset,d=1;a>d;d++){var f=e[d].offset;if(null!=f){for(var g=1;d-b>g;g++)e[b+g].offset=c+(f-c)*g/(d-b);b=d,c=f}}}if(!Array.isArray(b)&&null!==b)throw new TypeError("Keyframes must be null or an array of keyframes");if(null==b)return[];for(var e=b.map(function(b){var d={};for(var e in b){var f=b[e];if("offset"==e){if(null!=f&&(f=Number(f),!isFinite(f)))throw new TypeError("keyframe offsets must be numbers.")}else{if("composite"==e)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"add compositing is not supported"};f="easing"==e?a.toTimingFunction(f):""+f}c(e,f,d)}return void 0==d.offset&&(d.offset=null),void 0==d.easing&&(d.easing=a.toTimingFunction("linear")),d}),f=!0,g=-1/0,h=0;h<e.length;h++){var i=e[h].offset;if(null!=i){if(g>i)throw{code:DOMException.INVALID_MODIFICATION_ERR,name:"InvalidModificationError",message:"Keyframes are not loosely sorted by offset. Sort or specify offsets."};g=i}else f=!1}return e=e.filter(function(a){return a.offset>=0&&a.offset<=1}),f||d(),e}var e={background:["backgroundImage","backgroundPosition","backgroundSize","backgroundRepeat","backgroundAttachment","backgroundOrigin","backgroundClip","backgroundColor"],border:["borderTopColor","borderTopStyle","borderTopWidth","borderRightColor","borderRightStyle","borderRightWidth","borderBottomColor","borderBottomStyle","borderBottomWidth","borderLeftColor","borderLeftStyle","borderLeftWidth"],borderBottom:["borderBottomWidth","borderBottomStyle","borderBottomColor"],borderColor:["borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"],borderLeft:["borderLeftWidth","borderLeftStyle","borderLeftColor"],borderRadius:["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],borderRight:["borderRightWidth","borderRightStyle","borderRightColor"],borderTop:["borderTopWidth","borderTopStyle","borderTopColor"],borderWidth:["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"],flex:["flexGrow","flexShrink","flexBasis"],font:["fontFamily","fontSize","fontStyle","fontVariant","fontWeight","lineHeight"],margin:["marginTop","marginRight","marginBottom","marginLeft"],outline:["outlineColor","outlineStyle","outlineWidth"],padding:["paddingTop","paddingRight","paddingBottom","paddingLeft"]},f=document.createElementNS("http://www.w3.org/1999/xhtml","div"),g={thin:"1px",medium:"3px",thick:"5px"},h={borderBottomWidth:g,borderLeftWidth:g,borderRightWidth:g,borderTopWidth:g,fontSize:{"xx-small":"60%","x-small":"75%",small:"89%",medium:"100%",large:"120%","x-large":"150%","xx-large":"200%"},fontWeight:{normal:"400",bold:"700"},outlineWidth:g,textShadow:{none:"0px 0px 0px transparent"},boxShadow:{none:"0px 0px 0px 0px transparent"}};a.normalizeKeyframes=d}(c,f),function(a){var b={};a.isDeprecated=function(a,c,d,e){var f=e?"are":"is",g=new Date,h=new Date(c);return h.setMonth(h.getMonth()+3),h>g?(a in b||console.warn("Web Animations: "+a+" "+f+" deprecated and will stop working on "+h.toDateString()+". "+d),b[a]=!0,!1):!0},a.deprecated=function(b,c,d,e){var f=e?"are":"is";if(a.isDeprecated(b,c,d,e))throw new Error(b+" "+f+" no longer supported. "+d)}}(c),function(){if(document.documentElement.animate){var a=document.documentElement.animate([],0),b=!0;if(a&&(b=!1,"play|currentTime|pause|reverse|playbackRate|cancel|finish|startTime|playState".split("|").forEach(function(c){void 0===a[c]&&(b=!0)})),!b)return}!function(a,b){function c(a){for(var b={},c=0;c<a.length;c++)for(var d in a[c])if("offset"!=d&&"easing"!=d&&"composite"!=d){var e={offset:a[c].offset,easing:a[c].easing,value:a[c][d]};b[d]=b[d]||[],b[d].push(e)}for(var f in b){var g=b[f];if(0!=g[0].offset||1!=g[g.length-1].offset)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"Partial keyframes are not supported"}}return b}function d(a){var c=[];for(var d in a)for(var e=a[d],f=0;f<e.length-1;f++){var g=e[f].offset,h=e[f+1].offset,i=e[f].value,j=e[f+1].value;g==h&&(1==h?i=j:j=i),c.push({startTime:g,endTime:h,easing:e[f].easing,property:d,interpolation:b.propertyInterpolation(d,i,j)})}return c.sort(function(a,b){return a.startTime-b.startTime}),c}b.convertEffectInput=function(e){var f=a.normalizeKeyframes(e),g=c(f),h=d(g);return function(a,c){if(null!=c)h.filter(function(a){return 0>=c&&0==a.startTime||c>=1&&1==a.endTime||c>=a.startTime&&c<=a.endTime}).forEach(function(d){var e=c-d.startTime,f=d.endTime-d.startTime,g=0==f?0:d.easing(e/f);b.apply(a,d.property,d.interpolation(g))});else for(var d in g)"offset"!=d&&"easing"!=d&&"composite"!=d&&b.clear(a,d)}}}(c,d,f),function(a){function b(a,b,c){e[c]=e[c]||[],e[c].push([a,b])}function c(a,c,d){for(var e=0;e<d.length;e++){var f=d[e];b(a,c,f),/-/.test(f)&&b(a,c,f.replace(/-(.)/g,function(a,b){return b.toUpperCase()}))}}function d(b,c,d){if("initial"==c||"initial"==d){var g=b.replace(/-(.)/g,function(a,b){return b.toUpperCase()});"initial"==c&&(c=f[g]),"initial"==d&&(d=f[g])}for(var h=c==d?[]:e[b],i=0;h&&i<h.length;i++){var j=h[i][0](c),k=h[i][0](d);if(void 0!==j&&void 0!==k){var l=h[i][1](j,k);if(l){var m=a.Interpolation.apply(null,l);return function(a){return 0==a?c:1==a?d:m(a)}}}}return a.Interpolation(!1,!0,function(a){return a?d:c})}var e={};a.addPropertiesHandler=c;var f={backgroundColor:"transparent",backgroundPosition:"0% 0%",borderBottomColor:"currentColor",borderBottomLeftRadius:"0px",borderBottomRightRadius:"0px",borderBottomWidth:"3px",borderLeftColor:"currentColor",borderLeftWidth:"3px",borderRightColor:"currentColor",borderRightWidth:"3px",borderSpacing:"2px",borderTopColor:"currentColor",borderTopLeftRadius:"0px",borderTopRightRadius:"0px",borderTopWidth:"3px",bottom:"auto",clip:"rect(0px, 0px, 0px, 0px)",color:"black",fontSize:"100%",fontWeight:"400",height:"auto",left:"auto",letterSpacing:"normal",lineHeight:"120%",marginBottom:"0px",marginLeft:"0px",marginRight:"0px",marginTop:"0px",maxHeight:"none",maxWidth:"none",minHeight:"0px",minWidth:"0px",opacity:"1.0",outlineColor:"invert",outlineOffset:"0px",outlineWidth:"3px",paddingBottom:"0px",paddingLeft:"0px",paddingRight:"0px",paddingTop:"0px",right:"auto",textIndent:"0px",textShadow:"0px 0px 0px transparent",top:"auto",transform:"",verticalAlign:"0px",visibility:"visible",width:"auto",wordSpacing:"normal",zIndex:"auto"};a.propertyInterpolation=d}(d,f),function(a,b){function c(b){var c=a.calculateActiveDuration(b),d=function(d){return a.calculateTimeFraction(c,d,b)};return d._totalDuration=b.delay+c+b.endDelay,d._isCurrent=function(d){var e=a.calculatePhase(c,d,b);return e===PhaseActive||e===PhaseBefore},d}b.KeyframeEffect=function(d,e,f){var g,h=c(a.normalizeTimingInput(f)),i=b.convertEffectInput(e),j=function(){i(d,g)};return j._update=function(a){return g=h(a),null!==g},j._clear=function(){i(d,null)},j._hasSameTarget=function(a){return d===a},j._isCurrent=h._isCurrent,j._totalDuration=h._totalDuration,j},b.NullEffect=function(a){var b=function(){a&&(a(),a=null)};return b._update=function(){return null},b._totalDuration=0,b._isCurrent=function(){return!1},b._hasSameTarget=function(){return!1},b}}(c,d,f),function(a){a.apply=function(b,c,d){b.style[a.propertyName(c)]=d},a.clear=function(b,c){b.style[a.propertyName(c)]=""}}(d,f),function(a){window.Element.prototype.animate=function(b,c){return a.timeline._play(a.KeyframeEffect(this,b,c))}}(d),function(a){function b(a,c,d){if("number"==typeof a&&"number"==typeof c)return a*(1-d)+c*d;if("boolean"==typeof a&&"boolean"==typeof c)return.5>d?a:c;if(a.length==c.length){for(var e=[],f=0;f<a.length;f++)e.push(b(a[f],c[f],d));return e}throw"Mismatched interpolation arguments "+a+":"+c}a.Interpolation=function(a,c,d){return function(e){return d(b(a,c,e))}}}(d,f),function(a,b){a.sequenceNumber=0;var c=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="finish",this.bubbles=!1,this.cancelable=!1,this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()};b.Animation=function(b){this._sequenceNumber=a.sequenceNumber++,this._currentTime=0,this._startTime=null,this._paused=!1,this._playbackRate=1,this._inTimeline=!0,this._finishedFlag=!1,this.onfinish=null,this._finishHandlers=[],this._effect=b,this._inEffect=this._effect._update(0),this._idle=!0,this._currentTimePending=!1},b.Animation.prototype={_ensureAlive:function(){this._inEffect=this._effect._update(this.playbackRate<0&&0===this.currentTime?-1:this.currentTime),this._inTimeline||!this._inEffect&&this._finishedFlag||(this._inTimeline=!0,b.timeline._animations.push(this))},_tickCurrentTime:function(a,b){a!=this._currentTime&&(this._currentTime=a,this._isFinished&&!b&&(this._currentTime=this._playbackRate>0?this._totalDuration:0),this._ensureAlive())},get currentTime(){return this._idle||this._currentTimePending?null:this._currentTime},set currentTime(a){a=+a,isNaN(a)||(b.restart(),this._paused||null==this._startTime||(this._startTime=this._timeline.currentTime-a/this._playbackRate),this._currentTimePending=!1,this._currentTime!=a&&(this._tickCurrentTime(a,!0),b.invalidateEffects()))},get startTime(){return this._startTime},set startTime(a){a=+a,isNaN(a)||this._paused||this._idle||(this._startTime=a,this._tickCurrentTime((this._timeline.currentTime-this._startTime)*this.playbackRate),b.invalidateEffects())},get playbackRate(){return this._playbackRate},set playbackRate(a){if(a!=this._playbackRate){var b=this.currentTime;this._playbackRate=a,this._startTime=null,"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!=b&&(this.currentTime=b)}},get _isFinished(){return!this._idle&&(this._playbackRate>0&&this._currentTime>=this._totalDuration||this._playbackRate<0&&this._currentTime<=0)},get _totalDuration(){return this._effect._totalDuration},get playState(){return this._idle?"idle":null==this._startTime&&!this._paused&&0!=this.playbackRate||this._currentTimePending?"pending":this._paused?"paused":this._isFinished?"finished":"running"},play:function(){this._paused=!1,(this._isFinished||this._idle)&&(this._currentTime=this._playbackRate>0?0:this._totalDuration,this._startTime=null,b.invalidateEffects()),this._finishedFlag=!1,b.restart(),this._idle=!1,this._ensureAlive()},pause:function(){this._isFinished||this._paused||this._idle||(this._currentTimePending=!0),this._startTime=null,this._paused=!0},finish:function(){this._idle||(this.currentTime=this._playbackRate>0?this._totalDuration:0,this._startTime=this._totalDuration-this.currentTime,this._currentTimePending=!1)},cancel:function(){this._inEffect&&(this._inEffect=!1,this._idle=!0,this.currentTime=0,this._startTime=null,this._effect._update(null),b.invalidateEffects(),b.restart())},reverse:function(){this.playbackRate*=-1,this.play()},addEventListener:function(a,b){"function"==typeof b&&"finish"==a&&this._finishHandlers.push(b)},removeEventListener:function(a,b){if("finish"==a){var c=this._finishHandlers.indexOf(b);c>=0&&this._finishHandlers.splice(c,1)}},_fireEvents:function(a){var b=this._isFinished;if((b||this._idle)&&!this._finishedFlag){var d=new c(this,this._currentTime,a),e=this._finishHandlers.concat(this.onfinish?[this.onfinish]:[]);setTimeout(function(){e.forEach(function(a){a.call(d.target,d)})},0)}this._finishedFlag=b},_tick:function(a){return this._idle||this._paused||(null==this._startTime?this.startTime=a-this._currentTime/this.playbackRate:this._isFinished||this._tickCurrentTime((a-this._startTime)*this.playbackRate)),this._currentTimePending=!1,this._fireEvents(a),!this._idle&&(this._inEffect||!this._finishedFlag)}}}(c,d,f),function(a,b){function c(a){var b=i;i=[],a<s.currentTime&&(a=s.currentTime),g(a),b.forEach(function(b){b[1](a)}),o&&g(a),f(),l=void 0}function d(a,b){return a._sequenceNumber-b._sequenceNumber}function e(){this._animations=[],this.currentTime=window.performance&&performance.now?performance.now():0}function f(){p.forEach(function(a){a()}),p.length=0}function g(a){n=!1;var c=b.timeline;c.currentTime=a,c._animations.sort(d),m=!1;var e=c._animations;c._animations=[];var f=[],g=[];e=e.filter(function(b){return b._inTimeline=b._tick(a),b._inEffect?g.push(b._effect):f.push(b._effect),b._isFinished||b._paused||b._idle||(m=!0),b._inTimeline}),p.push.apply(p,f),p.push.apply(p,g),c._animations.push.apply(c._animations,e),o=!1,m&&requestAnimationFrame(function(){})}var h=window.requestAnimationFrame,i=[],j=0;window.requestAnimationFrame=function(a){var b=j++;return 0==i.length&&h(c),i.push([b,a]),b},window.cancelAnimationFrame=function(a){i.forEach(function(b){b[0]==a&&(b[1]=function(){})})},e.prototype={_play:function(c){c._timing=a.normalizeTimingInput(c.timing);var d=new b.Animation(c);return d._idle=!1,d._timeline=this,this._animations.push(d),b.restart(),b.invalidateEffects(),d}};var k,l=void 0,k=function(){return void 0==l&&(l=performance.now()),l},m=!1,n=!1;b.restart=function(){return m||(m=!0,requestAnimationFrame(function(){}),n=!0),n};var o=!1;b.invalidateEffects=function(){o=!0};var p=[],q=1e3/60,r=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){if(o){var a=k();a-s.currentTime>0&&(s.currentTime+=q*(Math.floor((a-s.currentTime)/q)+1)),g(s.currentTime)}return f(),r.apply(this,arguments)}});var s=new e;b.timeline=s}(c,d,f),function(a){function b(a,b){var c=a.exec(b);return c?(c=a.ignoreCase?c[0].toLowerCase():c[0],[c,b.substr(c.length)]):void 0}function c(a,b){b=b.replace(/^\s*/,"");var c=a(b);return c?[c[0],c[1].replace(/^\s*/,"")]:void 0}function d(a,d,e){a=c.bind(null,a);for(var f=[];;){var g=a(e);if(!g)return[f,e];if(f.push(g[0]),e=g[1],g=b(d,e),!g||""==g[1])return[f,e];e=g[1]}}function e(a,b){for(var c=0,d=0;d<b.length&&(!/\s|,/.test(b[d])||0!=c);d++)if("("==b[d])c++;else if(")"==b[d]&&(c--,0==c&&d++,0>=c))break;var e=a(b.substr(0,d));return void 0==e?void 0:[e,b.substr(d)]}function f(a,b){for(var c=a,d=b;c&&d;)c>d?c%=d:d%=c;return c=a*b/(c+d)}function g(a){return function(b){var c=a(b);return c&&(c[0]=void 0),c}}function h(a,b){return function(c){var d=a(c);return d?d:[b,c]}}function i(b,c){for(var d=[],e=0;e<b.length;e++){var f=a.consumeTrimmed(b[e],c);if(!f||""==f[0])return;void 0!==f[0]&&d.push(f[0]),c=f[1]}return""==c?d:void 0}function j(a,b,c,d,e){for(var g=[],h=[],i=[],j=f(d.length,e.length),k=0;j>k;k++){var l=b(d[k%d.length],e[k%e.length]);if(!l)return;g.push(l[0]),h.push(l[1]),i.push(l[2])}return[g,h,function(b){var d=b.map(function(a,b){return i[b](a)}).join(c);return a?a(d):d}]}function k(a,b,c){for(var d=[],e=[],f=[],g=0,h=0;h<c.length;h++)if("function"==typeof c[h]){var i=c[h](a[g],b[g++]);d.push(i[0]),e.push(i[1]),f.push(i[2])}else!function(a){d.push(!1),e.push(!1),f.push(function(){return c[a]})}(h);return[d,e,function(a){for(var b="",c=0;c<a.length;c++)b+=f[c](a[c]);return b}]}a.consumeToken=b,a.consumeTrimmed=c,a.consumeRepeated=d,a.consumeParenthesised=e,a.ignore=g,a.optional=h,a.consumeList=i,a.mergeNestedRepeated=j.bind(null,null),a.mergeWrappedNestedRepeated=j,a.mergeList=k}(d),function(a){function b(b){function c(b){var c=a.consumeToken(/^inset/i,b);if(c)return d.inset=!0,c;var c=a.consumeLengthOrPercent(b);if(c)return d.lengths.push(c[0]),c;var c=a.consumeColor(b);return c?(d.color=c[0],c):void 0}var d={inset:!1,lengths:[],color:null},e=a.consumeRepeated(c,/^/,b);return e&&e[0].length?[d,e[1]]:void 0}function c(c){var d=a.consumeRepeated(b,/^,/,c);return d&&""==d[1]?d[0]:void 0}function d(b,c){for(;b.lengths.length<Math.max(b.lengths.length,c.lengths.length);)b.lengths.push({px:0});for(;c.lengths.length<Math.max(b.lengths.length,c.lengths.length);)c.lengths.push({px:0});if(b.inset==c.inset&&!!b.color==!!c.color){for(var d,e=[],f=[[],0],g=[[],0],h=0;h<b.lengths.length;h++){var i=a.mergeDimensions(b.lengths[h],c.lengths[h],2==h);f[0].push(i[0]),g[0].push(i[1]),e.push(i[2])}if(b.color&&c.color){var j=a.mergeColors(b.color,c.color);f[1]=j[0],g[1]=j[1],d=j[2]}return[f,g,function(a){for(var c=b.inset?"inset ":" ",f=0;f<e.length;f++)c+=e[f](a[0][f])+" ";return d&&(c+=d(a[1])),c}]}}function e(b,c,d,e){function f(a){return{inset:a,color:[0,0,0,0],lengths:[{px:0},{px:0},{px:0},{px:0}]}}for(var g=[],h=[],i=0;i<d.length||i<e.length;i++){var j=d[i]||f(e[i].inset),k=e[i]||f(d[i].inset);g.push(j),h.push(k)}return a.mergeNestedRepeated(b,c,g,h)}var f=e.bind(null,d,", ");a.addPropertiesHandler(c,f,["box-shadow","text-shadow"])}(d),function(a){function b(a){return a.toFixed(3).replace(".000","")}function c(a,b,c){return Math.min(b,Math.max(a,c))}function d(a){return/^\s*[-+]?(\d*\.)?\d+\s*$/.test(a)?Number(a):void 0}function e(a,c){return[a,c,b]}function f(a,b){return 0!=a?h(0,1/0)(a,b):void 0}function g(a,b){return[a,b,function(a){return Math.round(c(1,1/0,a))}]}function h(a,d){return function(e,f){return[e,f,function(e){return b(c(a,d,e))}]}}function i(a,b){return[a,b,Math.round]}a.clamp=c,a.addPropertiesHandler(d,h(0,1/0),["border-image-width","line-height"]),a.addPropertiesHandler(d,h(0,1),["opacity","shape-image-threshold"]),a.addPropertiesHandler(d,f,["flex-grow","flex-shrink"]),a.addPropertiesHandler(d,g,["orphans","widows"]),a.addPropertiesHandler(d,i,["z-index"]),a.parseNumber=d,a.mergeNumbers=e,a.numberToString=b}(d,f),function(a){function b(a,b){return"visible"==a||"visible"==b?[0,1,function(c){return 0>=c?a:c>=1?b:"visible"}]:void 0}a.addPropertiesHandler(String,b,["visibility"])}(d),function(a){function b(a){a=a.trim(),e.fillStyle="#000",e.fillStyle=a;var b=e.fillStyle;if(e.fillStyle="#fff",e.fillStyle=a,b==e.fillStyle){e.fillRect(0,0,1,1);var c=e.getImageData(0,0,1,1).data;e.clearRect(0,0,1,1);var d=c[3]/255;return[c[0]*d,c[1]*d,c[2]*d,d]}}function c(b,c){return[b,c,function(b){function c(a){return Math.max(0,Math.min(255,a))}if(b[3])for(var d=0;3>d;d++)b[d]=Math.round(c(b[d]/b[3]));return b[3]=a.numberToString(a.clamp(0,1,b[3])),"rgba("+b.join(",")+")"}]}var d=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");d.width=d.height=1;var e=d.getContext("2d");a.addPropertiesHandler(b,c,["background-color","border-bottom-color","border-left-color","border-right-color","border-top-color","color","outline-color","text-decoration-color"]),a.consumeColor=a.consumeParenthesised.bind(null,b),a.mergeColors=c}(d,f),function(a,b){function c(a,b){if(b=b.trim().toLowerCase(),"0"==b&&"px".search(a)>=0)return{px:0};if(/^[^(]*$|^calc/.test(b)){b=b.replace(/calc\(/g,"(");var c={};b=b.replace(a,function(a){return c[a]=null,"U"+a});for(var d="U("+a.source+")",e=b.replace(/[-+]?(\d*\.)?\d+/g,"N").replace(new RegExp("N"+d,"g"),"D").replace(/\s[+-]\s/g,"O").replace(/\s/g,""),f=[/N\*(D)/g,/(N|D)[*/]N/g,/(N|D)O\1/g,/\((N|D)\)/g],g=0;g<f.length;)f[g].test(e)?(e=e.replace(f[g],"$1"),g=0):g++;if("D"==e){for(var h in c){var i=eval(b.replace(new RegExp("U"+h,"g"),"").replace(new RegExp(d,"g"),"*0"));if(!isFinite(i))return;c[h]=i}return c}}}function d(a,b){return e(a,b,!0)}function e(b,c,d){var e,f=[];for(e in b)f.push(e);for(e in c)f.indexOf(e)<0&&f.push(e);return b=f.map(function(a){return b[a]||0}),c=f.map(function(a){return c[a]||0}),[b,c,function(b){var c=b.map(function(c,e){return 1==b.length&&d&&(c=Math.max(c,0)),a.numberToString(c)+f[e]}).join(" + ");return b.length>1?"calc("+c+")":c}]}var f="px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc",g=c.bind(null,new RegExp(f,"g")),h=c.bind(null,new RegExp(f+"|%","g")),i=c.bind(null,/deg|rad|grad|turn/g);a.parseLength=g,a.parseLengthOrPercent=h,a.consumeLengthOrPercent=a.consumeParenthesised.bind(null,h),a.parseAngle=i,a.mergeDimensions=e;var j=a.consumeParenthesised.bind(null,g),k=a.consumeRepeated.bind(void 0,j,/^/),l=a.consumeRepeated.bind(void 0,k,/^,/);a.consumeSizePairList=l;var m=function(a){var b=l(a);return b&&""==b[1]?b[0]:void 0},n=a.mergeNestedRepeated.bind(void 0,d," "),o=a.mergeNestedRepeated.bind(void 0,n,",");a.mergeNonNegativeSizePair=n,a.addPropertiesHandler(m,o,["background-size"]),a.addPropertiesHandler(h,d,["border-bottom-width","border-image-width","border-left-width","border-right-width","border-top-width","flex-basis","font-size","height","line-height","max-height","max-width","outline-width","width"]),a.addPropertiesHandler(h,e,["border-bottom-left-radius","border-bottom-right-radius","border-top-left-radius","border-top-right-radius","bottom","left","letter-spacing","margin-bottom","margin-left","margin-right","margin-top","min-height","min-width","outline-offset","padding-bottom","padding-left","padding-right","padding-top","perspective","right","shape-margin","text-indent","top","vertical-align","word-spacing"])}(d,f),function(a){function b(b){return a.consumeLengthOrPercent(b)||a.consumeToken(/^auto/,b)}function c(c){var d=a.consumeList([a.ignore(a.consumeToken.bind(null,/^rect/)),a.ignore(a.consumeToken.bind(null,/^\(/)),a.consumeRepeated.bind(null,b,/^,/),a.ignore(a.consumeToken.bind(null,/^\)/))],c);return d&&4==d[0].length?d[0]:void 0}function d(b,c){return"auto"==b||"auto"==c?[!0,!1,function(d){var e=d?b:c;if("auto"==e)return"auto";var f=a.mergeDimensions(e,e);return f[2](f[0])}]:a.mergeDimensions(b,c)}function e(a){return"rect("+a+")"}var f=a.mergeWrappedNestedRepeated.bind(null,e,d,", ");a.parseBox=c,a.mergeBoxes=f,a.addPropertiesHandler(c,f,["clip"])}(d,f),function(a){function b(a){return function(b){var c=0;return a.map(function(a){return a===j?b[c++]:a})}}function c(a){return a}function d(b){if(b=b.toLowerCase().trim(),"none"==b)return[];for(var c,d=/\s*(\w+)\(([^)]*)\)/g,e=[],f=0;c=d.exec(b);){if(c.index!=f)return;f=c.index+c[0].length;var g=c[1],h=m[g];if(!h)return;var i=c[2].split(","),j=h[0];if(j.length<i.length)return;for(var n=[],o=0;o<j.length;o++){var p,q=i[o],r=j[o];if(p=q?{A:function(b){return"0"==b.trim()?l:a.parseAngle(b)},N:a.parseNumber,T:a.parseLengthOrPercent,L:a.parseLength}[r.toUpperCase()](q):{a:l,n:n[0],t:k}[r],void 0===p)return;n.push(p)}if(e.push({t:g,d:n}),d.lastIndex==b.length)return e}}function e(a){return a.toFixed(6).replace(".000000","")}function f(b,c){if(b.decompositionPair!==c){b.decompositionPair=c;var d=a.makeMatrixDecomposition(b)}if(c.decompositionPair!==b){c.decompositionPair=b;var f=a.makeMatrixDecomposition(c)}return null==d[0]||null==f[0]?[[!1],[!0],function(a){return a?c[0].d:b[0].d}]:(d[0].push(0),f[0].push(1),[d,f,function(b){var c=a.quat(d[0][3],f[0][3],b[5]),g=a.composeMatrix(b[0],b[1],b[2],c,b[4]),h=g.map(e).join(",");return h}])}function g(a){return a.replace(/[xy]/,"")}function h(a){return a.replace(/(x|y|z|3d)?$/,"3d")}function i(b,c){var d=a.makeMatrixDecomposition&&!0,e=!1;if(!b.length||!c.length){b.length||(e=!0,b=c,c=[]);for(var i=0;i<b.length;i++){var j=b[i].t,k=b[i].d,l="scale"==j.substr(0,5)?1:0;c.push({t:j,d:k.map(function(a){if("number"==typeof a)return l;var b={};for(var c in a)b[c]=l;return b})})}}var n=function(a,b){return"perspective"==a&&"perspective"==b||("matrix"==a||"matrix3d"==a)&&("matrix"==b||"matrix3d"==b)},o=[],p=[],q=[];if(b.length!=c.length){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]]}else for(var i=0;i<b.length;i++){var j,s=b[i].t,t=c[i].t,u=b[i].d,v=c[i].d,w=m[s],x=m[t];if(n(s,t)){if(!d)return;var r=f([b[i]],[c[i]]);o.push(r[0]),p.push(r[1]),q.push(["matrix",[r[2]]])}else{if(s==t)j=s;else if(w[2]&&x[2]&&g(s)==g(t))j=g(s),u=w[2](u),v=x[2](v);else{if(!w[1]||!x[1]||h(s)!=h(t)){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]];break}j=h(s),u=w[1](u),v=x[1](v)}for(var y=[],z=[],A=[],B=0;B<u.length;B++){var C="number"==typeof u[B]?a.mergeNumbers:a.mergeDimensions,r=C(u[B],v[B]);y[B]=r[0],z[B]=r[1],A.push(r[2])}o.push(y),p.push(z),q.push([j,A])}}if(e){var D=o;o=p,p=D}return[o,p,function(a){return a.map(function(a,b){var c=a.map(function(a,c){return q[b][1][c](a)}).join(",");return"matrix"==q[b][0]&&16==c.split(",").length&&(q[b][0]="matrix3d"),q[b][0]+"("+c+")"}).join(" ")}]}var j=null,k={px:0},l={deg:0},m={matrix:["NNNNNN",[j,j,0,0,j,j,0,0,0,0,1,0,j,j,0,1],c],matrix3d:["NNNNNNNNNNNNNNNN",c],rotate:["A"],rotatex:["A"],rotatey:["A"],rotatez:["A"],rotate3d:["NNNA"],perspective:["L"],scale:["Nn",b([j,j,1]),c],scalex:["N",b([j,1,1]),b([j,1])],scaley:["N",b([1,j,1]),b([1,j])],scalez:["N",b([1,1,j])],scale3d:["NNN",c],skew:["Aa",null,c],skewx:["A",null,b([j,l])],skewy:["A",null,b([l,j])],translate:["Tt",b([j,j,k]),c],translatex:["T",b([j,k,k]),b([j,k])],translatey:["T",b([k,j,k]),b([k,j])],translatez:["L",b([k,k,j])],translate3d:["TTL",c]};a.addPropertiesHandler(d,i,["transform"])}(d,f),function(a){function b(a,b){b.concat([a]).forEach(function(b){b in document.documentElement.style&&(c[a]=b)})}var c={};b("transform",["webkitTransform","msTransform"]),b("transformOrigin",["webkitTransformOrigin"]),b("perspective",["webkitPerspective"]),b("perspectiveOrigin",["webkitPerspectiveOrigin"]),a.propertyName=function(a){return c[a]||a}}(d,f)}(),!function(a,b){function c(a){var b=window.document.timeline;b.currentTime=a,b._discardAnimations(),0==b._animations.length?e=!1:requestAnimationFrame(c)}var d=window.requestAnimationFrame;window.requestAnimationFrame=function(a){return d(function(b){window.document.timeline._updateAnimationsPromises(),a(b),window.document.timeline._updateAnimationsPromises()})},b.AnimationTimeline=function(){this._animations=[],this.currentTime=void 0},b.AnimationTimeline.prototype={getAnimations:function(){return this._discardAnimations(),this._animations.slice()},_updateAnimationsPromises:function(){b.animationsWithPromises=b.animationsWithPromises.filter(function(a){return a._updatePromises()})},_discardAnimations:function(){this._updateAnimationsPromises(),this._animations=this._animations.filter(function(a){return"finished"!=a.playState&&"idle"!=a.playState})},_play:function(a){var c=new b.Animation(a,this);return this._animations.push(c),b.restartWebAnimationsNextTick(),c._updatePromises(),c._animation.play(),c._updatePromises(),c},play:function(a){return a&&a.remove(),this._play(a)}};var e=!1;b.restartWebAnimationsNextTick=function(){e||(e=!0,requestAnimationFrame(c))};var f=new b.AnimationTimeline;b.timeline=f;try{Object.defineProperty(window.document,"timeline",{configurable:!0,get:function(){return f}})}catch(g){}try{window.document.timeline=f}catch(g){}}(c,e,f),function(a,b){b.animationsWithPromises=[],b.Animation=function(b,c){if(this.effect=b,b&&(b._animation=this),!c)throw new Error("Animation with null timeline is not supported");this._timeline=c,this._sequenceNumber=a.sequenceNumber++,this._holdTime=0,this._paused=!1,this._isGroup=!1,this._animation=null,this._childAnimations=[],this._callback=null,this._oldPlayState="idle",this._rebuildUnderlyingAnimation(),this._animation.cancel(),this._updatePromises()},b.Animation.prototype={_updatePromises:function(){var a=this._oldPlayState,b=this.playState;return this._readyPromise&&b!==a&&("idle"==b?(this._rejectReadyPromise(),this._readyPromise=void 0):"pending"==a?this._resolveReadyPromise():"pending"==b&&(this._readyPromise=void 0)),this._finishedPromise&&b!==a&&("idle"==b?(this._rejectFinishedPromise(),this._finishedPromise=void 0):"finished"==b?this._resolveFinishedPromise():"finished"==a&&(this._finishedPromise=void 0)),this._oldPlayState=this.playState,this._readyPromise||this._finishedPromise},_rebuildUnderlyingAnimation:function(){this._updatePromises();var a,c,d,e,f=this._animation?!0:!1;f&&(a=this.playbackRate,c=this._paused,d=this.startTime,e=this.currentTime,this._animation.cancel(),this._animation._wrapper=null,this._animation=null),(!this.effect||this.effect instanceof window.KeyframeEffect)&&(this._animation=b.newUnderlyingAnimationForKeyframeEffect(this.effect),b.bindAnimationForKeyframeEffect(this)),(this.effect instanceof window.SequenceEffect||this.effect instanceof window.GroupEffect)&&(this._animation=b.newUnderlyingAnimationForGroup(this.effect),b.bindAnimationForGroup(this)),this.effect&&this.effect._onsample&&b.bindAnimationForCustomEffect(this),f&&(1!=a&&(this.playbackRate=a),null!==d?this.startTime=d:null!==e?this.currentTime=e:null!==this._holdTime&&(this.currentTime=this._holdTime),c&&this.pause()),this._updatePromises()
},_updateChildren:function(){if(this.effect&&"idle"!=this.playState){var a=this.effect._timing.delay;this._childAnimations.forEach(function(c){this._arrangeChildren(c,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c.effect))}.bind(this))}},_setExternalAnimation:function(a){if(this.effect&&this._isGroup)for(var b=0;b<this.effect.children.length;b++)this.effect.children[b]._animation=a,this._childAnimations[b]._setExternalAnimation(a)},_constructChildAnimations:function(){if(this.effect&&this._isGroup){var a=this.effect._timing.delay;this._removeChildAnimations(),this.effect.children.forEach(function(c){var d=window.document.timeline._play(c);this._childAnimations.push(d),d.playbackRate=this.playbackRate,this._paused&&d.pause(),c._animation=this.effect._animation,this._arrangeChildren(d,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c))}.bind(this))}},_arrangeChildren:function(a,b){null===this.startTime?a.currentTime=this.currentTime-b/this.playbackRate:a.startTime!==this.startTime+b/this.playbackRate&&(a.startTime=this.startTime+b/this.playbackRate)},get timeline(){return this._timeline},get playState(){return this._animation?this._animation.playState:"idle"},get finished(){return window.Promise?(this._finishedPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._finishedPromise=new Promise(function(a,b){this._resolveFinishedPromise=function(){a(this)},this._rejectFinishedPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"finished"==this.playState&&this._resolveFinishedPromise()),this._finishedPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get ready(){return window.Promise?(this._readyPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._readyPromise=new Promise(function(a,b){this._resolveReadyPromise=function(){a(this)},this._rejectReadyPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"pending"!==this.playState&&this._resolveReadyPromise()),this._readyPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get onfinish(){return this._onfinish},set onfinish(a){"function"==typeof a?(this._onfinish=a,this._animation.onfinish=function(b){b.target=this,a.call(this,b)}.bind(this)):(this._animation.onfinish=a,this.onfinish=this._animation.onfinish)},get currentTime(){this._updatePromises();var a=this._animation.currentTime;return this._updatePromises(),a},set currentTime(a){this._updatePromises(),this._animation.currentTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.currentTime=a-c}),this._updatePromises()},get startTime(){return this._animation.startTime},set startTime(a){this._updatePromises(),this._animation.startTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.startTime=a+c}),this._updatePromises()},get playbackRate(){return this._animation.playbackRate},set playbackRate(a){this._updatePromises();var b=this.currentTime;this._animation.playbackRate=a,this._forEachChild(function(b){b.playbackRate=a}),"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!==b&&(this.currentTime=b),this._updatePromises()},play:function(){this._updatePromises(),this._paused=!1,this._animation.play(),-1==this._timeline._animations.indexOf(this)&&this._timeline._animations.push(this),this._register(),b.awaitStartTime(this),this._forEachChild(function(a){var b=a.currentTime;a.play(),a.currentTime=b}),this._updatePromises()},pause:function(){this._updatePromises(),this.currentTime&&(this._holdTime=this.currentTime),this._animation.pause(),this._register(),this._forEachChild(function(a){a.pause()}),this._paused=!0,this._updatePromises()},finish:function(){this._updatePromises(),this._animation.finish(),this._register(),this._updatePromises()},cancel:function(){this._updatePromises(),this._animation.cancel(),this._register(),this._removeChildAnimations(),this._updatePromises()},reverse:function(){this._updatePromises();var a=this.currentTime;this._animation.reverse(),this._forEachChild(function(a){a.reverse()}),null!==a&&(this.currentTime=a),this._updatePromises()},addEventListener:function(a,b){var c=b;"function"==typeof b&&(c=function(a){a.target=this,b.call(this,a)}.bind(this),b._wrapper=c),this._animation.addEventListener(a,c)},removeEventListener:function(a,b){this._animation.removeEventListener(a,b&&b._wrapper||b)},_removeChildAnimations:function(){for(;this._childAnimations.length;)this._childAnimations.pop().cancel()},_forEachChild:function(b){var c=0;if(this.effect.children&&this._childAnimations.length<this.effect.children.length&&this._constructChildAnimations(),this._childAnimations.forEach(function(a){b.call(this,a,c),this.effect instanceof window.SequenceEffect&&(c+=a.effect.activeDuration)}.bind(this)),"pending"!=this.playState){var d=this.effect._timing,e=this.currentTime;null!==e&&(e=a.calculateTimeFraction(a.calculateActiveDuration(d),e,d)),(null==e||isNaN(e))&&this._removeChildAnimations()}}},window.Animation=b.Animation}(c,e,f),function(a,b){function c(b){this._frames=a.normalizeKeyframes(b)}function d(){for(var a=!1;h.length;){var b=h.shift();b._updateChildren(),a=!0}return a}var e=function(a){if(a._animation=void 0,a instanceof window.SequenceEffect||a instanceof window.GroupEffect)for(var b=0;b<a.children.length;b++)e(a.children[b])};b.removeMulti=function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c];d._parent?(-1==b.indexOf(d._parent)&&b.push(d._parent),d._parent.children.splice(d._parent.children.indexOf(d),1),d._parent=null,e(d)):d._animation&&d._animation.effect==d&&(d._animation.cancel(),d._animation.effect=new KeyframeEffect(null,[]),d._animation._callback&&(d._animation._callback._animation=null),d._animation._rebuildUnderlyingAnimation(),e(d))}for(c=0;c<b.length;c++)b[c]._rebuild()},b.KeyframeEffect=function(b,d,e){return this.target=b,this._parent=null,e=a.numericTimingToObject(e),this._timingInput=a.cloneTimingInput(e),this._timing=a.normalizeTimingInput(e),this.timing=a.makeTiming(e,!1,this),this.timing._effect=this,"function"==typeof d?(a.deprecated("Custom KeyframeEffect","2015-06-22","Use KeyframeEffect.onsample instead."),this._normalizedKeyframes=d):this._normalizedKeyframes=new c(d),this._keyframes=d,this.activeDuration=a.calculateActiveDuration(this._timing),this},b.KeyframeEffect.prototype={getFrames:function(){return"function"==typeof this._normalizedKeyframes?this._normalizedKeyframes:this._normalizedKeyframes._frames},set onsample(a){if("function"==typeof this.getFrames())throw new Error("Setting onsample on custom effect KeyframeEffect is not supported.");this._onsample=a,this._animation&&this._animation._rebuildUnderlyingAnimation()},get parent(){return this._parent},clone:function(){if("function"==typeof this.getFrames())throw new Error("Cloning custom effects is not supported.");var b=new KeyframeEffect(this.target,[],a.cloneTimingInput(this._timingInput));return b._normalizedKeyframes=this._normalizedKeyframes,b._keyframes=this._keyframes,b},remove:function(){b.removeMulti([this])}};var f=Element.prototype.animate;Element.prototype.animate=function(a,c){return b.timeline._play(new b.KeyframeEffect(this,a,c))};var g=document.createElementNS("http://www.w3.org/1999/xhtml","div");b.newUnderlyingAnimationForKeyframeEffect=function(a){if(a){var b=a.target||g,c=a._keyframes;"function"==typeof c&&(c=[]);var d=a._timingInput}else var b=g,c=[],d=0;return f.apply(b,[c,d])},b.bindAnimationForKeyframeEffect=function(a){a.effect&&"function"==typeof a.effect._normalizedKeyframes&&b.bindAnimationForCustomEffect(a)};var h=[];b.awaitStartTime=function(a){null===a.startTime&&a._isGroup&&(0==h.length&&requestAnimationFrame(d),h.push(a))};var i=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){window.document.timeline._updateAnimationsPromises();var a=i.apply(this,arguments);return d()&&(a=i.apply(this,arguments)),window.document.timeline._updateAnimationsPromises(),a}}),window.KeyframeEffect=b.KeyframeEffect,window.Element.prototype.getAnimations=function(){return document.timeline.getAnimations().filter(function(a){return null!==a.effect&&a.effect.target==this}.bind(this))}}(c,e,f),function(a,b){function c(a){a._registered||(a._registered=!0,f.push(a),g||(g=!0,requestAnimationFrame(d)))}function d(){var a=f;f=[],a.sort(function(a,b){return a._sequenceNumber-b._sequenceNumber}),a=a.filter(function(a){a();var b=a._animation?a._animation.playState:"idle";return"running"!=b&&"pending"!=b&&(a._registered=!1),a._registered}),f.push.apply(f,a),f.length?(g=!0,requestAnimationFrame(d)):g=!1}var e=(document.createElementNS("http://www.w3.org/1999/xhtml","div"),0);b.bindAnimationForCustomEffect=function(b){var d,f=b.effect.target,g="function"==typeof b.effect.getFrames();d=g?b.effect.getFrames():b.effect._onsample;var h=b.effect.timing,i=null;h=a.normalizeTimingInput(h);var j=function(){var c=j._animation?j._animation.currentTime:null;null!==c&&(c=a.calculateTimeFraction(a.calculateActiveDuration(h),c,h),isNaN(c)&&(c=null)),c!==i&&(g?d(c,f,b.effect):d(c,b.effect,b.effect._animation)),i=c};j._animation=b,j._registered=!1,j._sequenceNumber=e++,b._callback=j,c(j)};var f=[],g=!1;b.Animation.prototype._register=function(){this._callback&&c(this._callback)}}(c,e,f),function(a,b){function c(a){return a._timing.delay+a.activeDuration+a._timing.endDelay}function d(b,c){this._parent=null,this.children=b||[],this._reparent(this.children),c=a.numericTimingToObject(c),this._timingInput=a.cloneTimingInput(c),this._timing=a.normalizeTimingInput(c,!0),this.timing=a.makeTiming(c,!0,this),this.timing._effect=this,"auto"===this._timing.duration&&(this._timing.duration=this.activeDuration)}window.SequenceEffect=function(){d.apply(this,arguments)},window.GroupEffect=function(){d.apply(this,arguments)},d.prototype={_isAncestor:function(a){for(var b=this;null!==b;){if(b==a)return!0;b=b._parent}return!1},_rebuild:function(){for(var a=this;a;)"auto"===a.timing.duration&&(a._timing.duration=a.activeDuration),a=a._parent;this._animation&&this._animation._rebuildUnderlyingAnimation()},_reparent:function(a){b.removeMulti(a);for(var c=0;c<a.length;c++)a[c]._parent=this},_putChild:function(a,b){for(var c=b?"Cannot append an ancestor or self":"Cannot prepend an ancestor or self",d=0;d<a.length;d++)if(this._isAncestor(a[d]))throw{type:DOMException.HIERARCHY_REQUEST_ERR,name:"HierarchyRequestError",message:c};for(var d=0;d<a.length;d++)b?this.children.push(a[d]):this.children.unshift(a[d]);this._reparent(a),this._rebuild()},append:function(){this._putChild(arguments,!0)},prepend:function(){this._putChild(arguments,!1)},get parent(){return this._parent},get firstChild(){return this.children.length?this.children[0]:null},get lastChild(){return this.children.length?this.children[this.children.length-1]:null},clone:function(){for(var b=a.cloneTimingInput(this._timingInput),c=[],d=0;d<this.children.length;d++)c.push(this.children[d].clone());return this instanceof GroupEffect?new GroupEffect(c,b):new SequenceEffect(c,b)},remove:function(){b.removeMulti([this])}},window.SequenceEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.SequenceEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a+=c(b)}),Math.max(a,0)}}),window.GroupEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.GroupEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a=Math.max(a,c(b))}),a}}),b.newUnderlyingAnimationForGroup=function(c){var d,e=null,f=function(b){var c=d._wrapper;return c&&"pending"!=c.playState&&c.effect?null==b?void c._removeChildAnimations():0==b&&c.playbackRate<0&&(e||(e=a.normalizeTimingInput(c.effect.timing)),b=a.calculateTimeFraction(a.calculateActiveDuration(e),-1,e),isNaN(b)||null==b)?(c._forEachChild(function(a){a.currentTime=-1}),void c._removeChildAnimations()):void 0:void 0},g=new KeyframeEffect(null,[],c._timing);return g.onsample=f,d=b.timeline._play(g)},b.bindAnimationForGroup=function(a){a._animation._wrapper=a,a._isGroup=!0,b.awaitStartTime(a),a._constructChildAnimations(),a._setExternalAnimation(a)},b.groupChildDuration=c}(c,e,f)}({},function(){return this}());
//# sourceMappingURL=web-animations-next-lite.min.js.map
Polymer({

    is: 'opaque-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      node.style.opacity = '0';
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function(config) {
      config.node.style.opacity = '';
    }

  });
/**
   * `Polymer.NeonAnimatableBehavior` is implemented by elements containing animations for use with
   * elements implementing `Polymer.NeonAnimationRunnerBehavior`.
   * @polymerBehavior
   */
  Polymer.NeonAnimatableBehavior = {

    properties: {

      /**
       * Animation configuration. See README for more info.
       */
      animationConfig: {
        type: Object
      },

      /**
       * Convenience property for setting an 'entry' animation. Do not set `animationConfig.entry`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      entryAnimation: {
        observer: '_entryAnimationChanged',
        type: String
      },

      /**
       * Convenience property for setting an 'exit' animation. Do not set `animationConfig.exit`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      exitAnimation: {
        observer: '_exitAnimationChanged',
        type: String
      }

    },

    _entryAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      if (this.entryAnimation !== 'fade-in-animation') {
        // insert polyfill hack
        this.animationConfig['entry'] = [{
          name: 'opaque-animation',
          node: this
        }, {
          name: this.entryAnimation,
          node: this
        }];
      } else {
        this.animationConfig['entry'] = [{
          name: this.entryAnimation,
          node: this
        }];
      }
    },

    _exitAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      this.animationConfig['exit'] = [{
        name: this.exitAnimation,
        node: this
      }];
    },

    _copyProperties: function(config1, config2) {
      // shallowly copy properties from config2 to config1
      for (var property in config2) {
        config1[property] = config2[property];
      }
    },

    _cloneConfig: function(config) {
      var clone = {
        isClone: true
      };
      this._copyProperties(clone, config);
      return clone;
    },

    _getAnimationConfigRecursive: function(type, map, allConfigs) {
      if (!this.animationConfig) {
        return;
      }

      // type is optional
      var thisConfig;
      if (type) {
        thisConfig = this.animationConfig[type];
      } else {
        thisConfig = this.animationConfig;
      }

      if (!Array.isArray(thisConfig)) {
        thisConfig = [thisConfig];
      }

      // iterate animations and recurse to process configurations from child nodes
      if (thisConfig) {
        for (var config, index = 0; config = thisConfig[index]; index++) {
          if (config.animatable) {
            config.animatable._getAnimationConfigRecursive(config.type || type, map, allConfigs);
          } else {
            if (config.id) {
              var cachedConfig = map[config.id];
              if (cachedConfig) {
                // merge configurations with the same id, making a clone lazily
                if (!cachedConfig.isClone) {
                  map[config.id] = this._cloneConfig(cachedConfig)
                  cachedConfig = map[config.id];
                }
                this._copyProperties(cachedConfig, config);
              } else {
                // put any configs with an id into a map
                map[config.id] = config;
              }
            } else {
              allConfigs.push(config);
            }
          }
        }
      }
    },

    /**
     * An element implementing `Polymer.NeonAnimationRunnerBehavior` calls this method to configure
     * an animation with an optional type. Elements implementing `Polymer.NeonAnimatableBehavior`
     * should define the property `animationConfig`, which is either a configuration object
     * or a map of animation type to array of configuration objects.
     */
    getAnimationConfig: function(type) {
      var map = [];
      var allConfigs = [];
      this._getAnimationConfigRecursive(type, map, allConfigs);
      // append the configurations saved in the map to the array
      for (var key in map) {
        allConfigs.push(map[key]);
      }
      return allConfigs;
    }

  };
/**
   * `Polymer.NeonAnimationRunnerBehavior` adds a method to run animations.
   *
   * @polymerBehavior Polymer.NeonAnimationRunnerBehavior
   */
  Polymer.NeonAnimationRunnerBehaviorImpl = {

    properties: {

      _animationMeta: {
        type: Object,
        value: function() {
          return new Polymer.IronMeta({type: 'animation'});
        }
      },

      /** @type {?Object} */
      _player: {
        type: Object
      }

    },

    _configureAnimationEffects: function(allConfigs) {
      var allAnimations = [];
      if (allConfigs.length > 0) {
        for (var config, index = 0; config = allConfigs[index]; index++) {
          var animationConstructor = this._animationMeta.byKey(config.name);
          if (animationConstructor) {
            var animation = animationConstructor && new animationConstructor();
            var effect = animation.configure(config);
            if (effect) {
              allAnimations.push({
                animation: animation,
                config: config,
                effect: effect
              });
            }
          } else {
            console.warn(this.is + ':', config.name, 'not found!');
          }
        }
      }
      return allAnimations;
    },

    _runAnimationEffects: function(allEffects) {
      return document.timeline.play(new GroupEffect(allEffects));
    },

    _completeAnimations: function(allAnimations) {
      for (var animation, index = 0; animation = allAnimations[index]; index++) {
        animation.animation.complete(animation.config);
      }
    },

    /**
     * Plays an animation with an optional `type`.
     * @param {string=} type
     * @param {!Object=} cookie
     */
    playAnimation: function(type, cookie) {
      var allConfigs = this.getAnimationConfig(type);
      if (!allConfigs) {
        return;
      }
      var allAnimations = this._configureAnimationEffects(allConfigs);
      var allEffects = allAnimations.map(function(animation) {
        return animation.effect;
      });

      if (allEffects.length > 0) {
        this._player = this._runAnimationEffects(allEffects);
        this._player.onfinish = function() {
          this._completeAnimations(allAnimations);

          if (this._player) {
            this._player.cancel();
            this._player = null;
          }

          this.fire('neon-animation-finish', cookie, {bubbles: false});
        }.bind(this);

      } else {
        this.fire('neon-animation-finish', cookie, {bubbles: false});
      }
    },

    /**
     * Cancels the currently running animation.
     */
    cancelAnimation: function() {
      if (this._player) {
        this._player.cancel();
      }
    }
  };

  /** @polymerBehavior Polymer.NeonAnimationRunnerBehavior */
  Polymer.NeonAnimationRunnerBehavior = [
    Polymer.NeonAnimatableBehavior,
    Polymer.NeonAnimationRunnerBehaviorImpl
  ];
(function() {
    'use strict';

    /**
     * The IronDropdownScrollManager is intended to provide a central source
     * of authority and control over which elements in a document are currently
     * allowed to scroll.
     */

    Polymer.IronDropdownScrollManager = {

      /**
       * The current element that defines the DOM boundaries of the
       * scroll lock. This is always the most recently locking element.
       */
      get currentLockingElement() {
        return this._lockingElements[this._lockingElements.length - 1];
      },


      /**
       * Returns true if the provided element is "scroll locked," which is to
       * say that it cannot be scrolled via pointer or keyboard interactions.
       *
       * @param {HTMLElement} element An HTML element instance which may or may
       * not be scroll locked.
       */
      elementIsScrollLocked: function(element) {
        var currentLockingElement = this.currentLockingElement;
        var scrollLocked;

        if (this._hasCachedLockedElement(element)) {
          return true;
        }

        if (this._hasCachedUnlockedElement(element)) {
          return false;
        }

        scrollLocked = !!currentLockingElement &&
          currentLockingElement !== element &&
          !this._composedTreeContains(currentLockingElement, element);

        if (scrollLocked) {
          this._lockedElementCache.push(element);
        } else {
          this._unlockedElementCache.push(element);
        }

        return scrollLocked;
      },

      /**
       * Push an element onto the current scroll lock stack. The most recently
       * pushed element and its children will be considered scrollable. All
       * other elements will not be scrollable.
       *
       * Scroll locking is implemented as a stack so that cases such as
       * dropdowns within dropdowns are handled well.
       *
       * @param {HTMLElement} element The element that should lock scroll.
       */
      pushScrollLock: function(element) {
        if (this._lockingElements.length === 0) {
          this._lockScrollInteractions();
        }

        this._lockingElements.push(element);

        this._lockedElementCache = [];
        this._unlockedElementCache = [];
      },

      /**
       * Remove an element from the scroll lock stack. The element being
       * removed does not need to be the most recently pushed element. However,
       * the scroll lock constraints only change when the most recently pushed
       * element is removed.
       *
       * @param {HTMLElement} element The element to remove from the scroll
       * lock stack.
       */
      removeScrollLock: function(element) {
        var index = this._lockingElements.indexOf(element);

        if (index === -1) {
          return;
        }

        this._lockingElements.splice(index, 1);

        this._lockedElementCache = [];
        this._unlockedElementCache = [];

        if (this._lockingElements.length === 0) {
          this._unlockScrollInteractions();
        }
      },

      _lockingElements: [],

      _lockedElementCache: null,

      _unlockedElementCache: null,

      _originalBodyStyles: {},

      _isScrollingKeypress: function(event) {
        return Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(
          event, 'pageup pagedown home end up left down right');
      },

      _hasCachedLockedElement: function(element) {
        return this._lockedElementCache.indexOf(element) > -1;
      },

      _hasCachedUnlockedElement: function(element) {
        return this._unlockedElementCache.indexOf(element) > -1;
      },

      _composedTreeContains: function(element, child) {
        // NOTE(cdata): This method iterates over content elements and their
        // corresponding distributed nodes to implement a contains-like method
        // that pierces through the composed tree of the ShadowDOM. Results of
        // this operation are cached (elsewhere) on a per-scroll-lock basis, to
        // guard against potentially expensive lookups happening repeatedly as
        // a user scrolls / touchmoves.
        var contentElements;
        var distributedNodes;
        var contentIndex;
        var nodeIndex;

        if (element.contains(child)) {
          return true;
        }

        contentElements = Polymer.dom(element).querySelectorAll('content');

        for (contentIndex = 0; contentIndex < contentElements.length; ++contentIndex) {

          distributedNodes = Polymer.dom(contentElements[contentIndex]).getDistributedNodes();

          for (nodeIndex = 0; nodeIndex < distributedNodes.length; ++nodeIndex) {

            if (this._composedTreeContains(distributedNodes[nodeIndex], child)) {
              return true;
            }
          }
        }

        return false;
      },

      _scrollInteractionHandler: function(event) {
        if (Polymer
              .IronDropdownScrollManager
              .elementIsScrollLocked(event.target)) {
          if (event.type === 'keydown' &&
              !Polymer.IronDropdownScrollManager._isScrollingKeypress(event)) {
            return;
          }

          event.preventDefault();
        }
      },

      _lockScrollInteractions: function() {
        // Memoize body inline styles:
        this._originalBodyStyles.overflow = document.body.style.overflow;
        this._originalBodyStyles.overflowX = document.body.style.overflowX;
        this._originalBodyStyles.overflowY = document.body.style.overflowY;

        // Disable overflow scrolling on body:
        // TODO(cdata): It is technically not sufficient to hide overflow on
        // body alone. A better solution might be to traverse all ancestors of
        // the current scroll locking element and hide overflow on them. This
        // becomes expensive, though, as it would have to be redone every time
        // a new scroll locking element is added.
        document.body.style.overflow = 'hidden';
        document.body.style.overflowX = 'hidden';
        document.body.style.overflowY = 'hidden';

        // Modern `wheel` event for mouse wheel scrolling:
        window.addEventListener('wheel', this._scrollInteractionHandler, true);
        // Older, non-standard `mousewheel` event for some FF:
        window.addEventListener('mousewheel', this._scrollInteractionHandler, true);
        // IE:
        window.addEventListener('DOMMouseScroll', this._scrollInteractionHandler, true);
        // Mobile devices can scroll on touch move:
        window.addEventListener('touchmove', this._scrollInteractionHandler, true);
        // Capture keydown to prevent scrolling keys (pageup, pagedown etc.)
        document.addEventListener('keydown', this._scrollInteractionHandler, true);
      },

      _unlockScrollInteractions: function() {
        document.body.style.overflow = this._originalBodyStyles.overflow;
        document.body.style.overflowX = this._originalBodyStyles.overflowX;
        document.body.style.overflowY = this._originalBodyStyles.overflowY;

        window.removeEventListener('wheel', this._scrollInteractionHandler, true);
        window.removeEventListener('mousewheel', this._scrollInteractionHandler, true);
        window.removeEventListener('DOMMouseScroll', this._scrollInteractionHandler, true);
        window.removeEventListener('touchmove', this._scrollInteractionHandler, true);
        document.removeEventListener('keydown', this._scrollInteractionHandler, true);
      }
    };
  })();
/*
``<iron-form>` is an HTML `<form>` element that can validate and submit any custom
elements that implement `Polymer.IronFormElementBehavior`, as well as any
native HTML elements.

It supports both `get` and `post` methods, and uses an `iron-ajax` element to
submit the form data to the action URL.

  Example:

    <form is="iron-form" id="form" method="post" action="/form/handler">
      <paper-input name="name" label="name"></paper-input>
      <input name="address">
      ...
    </form>

By default, a native `<button>` element will submit this form. However, if you
want to submit it from a custom element's click handler, you need to explicitly
call the form's `submit` method.

  Example:

    <paper-button raised onclick="submitForm()">Submit</paper-button>

    function submitForm() {
      document.getElementById('form').submit();
    }

To customize the request sent to the server, you can listen to the `iron-form-presubmit`
event, and modify the form's[`iron-ajax`](https://elements.polymer-project.org/elements/iron-ajax)
object. However, If you want to not use `iron-ajax` at all, you can cancel the
event and do your own custom submission:

  Example of modifying the request, but still using the build-in form submission:
    form.addEventListener('iron-form-presubmit', function() {
      this.request.method = 'put';
      this.request.params = someCustomParams;
    });

  Example of bypassing the build-in form submission:
    form.addEventListener('iron-form-presubmit', function(event) {
      event.preventDefault();
      var firebase = new Firebase(form.getAttribute('action'));
      firebase.set(form.serialize());
    });

@demo demo/index.html
*/

  Polymer({

    is: 'iron-form',

    extends: 'form',

    properties: {
      /**
       * Content type to use when sending data.
       */
      contentType: {
        type: String,
        value: "application/x-www-form-urlencoded"
      },

      /**
       * By default, the form will display the browser's native validation
       * UI (i.e. popup bubbles and invalid styles on invalid fields). You can
       * manually disable this; however, if you do, note that you will have to
       * manually style invalid *native* HTML fields yourself, as you are
       * explicitly preventing the native form from doing so.
       */
      disableNativeValidationUi: {
        type: Boolean,
        value: false
      },

      /**
      * Set the withCredentials flag when sending data.
      */
      withCredentials: {
        type: Boolean,
        value: false
      },

      /**
      * HTTP request headers to send
      *
      * Note: setting a `Content-Type` header here will override the value
      * specified by the `contentType` property of this element.
      */
      headers: {
        type: Object,
        value: function() {
          return {};
        }
      },

      /**
      * iron-ajax request object used to submit the form.
      */
      request: {
        type: Object,
      }
    },

    /**
     * Fired if the form cannot be submitted because it's invalid.
     *
     * @event iron-form-invalid
     */

    /**
     * Fired before the form is submitted.
     *
     * @event iron-form-presubmit
     */

    /**
     * Fired after the form is submitted.
     *
     * @event iron-form-submit
     */

     /**
      * Fired after the form is reset.
      *
      * @event iron-form-reset
      */

    /**
    * Fired after the form is submitted and a response is received.
    *
    * @event iron-form-response
    */

    /**
     * Fired after the form is submitted and an error is received.
     *
     * @event iron-form-error
     */
    listeners: {
      'iron-form-element-register': '_registerElement',
      'iron-form-element-unregister': '_unregisterElement',
      'submit': '_onSubmit',
      'reset': '_onReset'
    },

    ready: function() {
      // Object that handles the ajax form submission request.
      this.request = document.createElement('iron-ajax');
      this.request.addEventListener('response', this._handleFormResponse.bind(this));
      this.request.addEventListener('error', this._handleFormError.bind(this));

      // Holds all the custom elements registered with this form.
      this._customElements = [];
      // Holds the initial values of the custom elements registered with this form.
      this._customElementsInitialValues = [];
    },

    /**
     * Submits the form.
     */
    submit: function() {
      if (!this.noValidate && !this.validate()) {
        // In order to trigger the native browser invalid-form UI, we need
        // to do perform a fake form submit.
        if (!this.disableNativeValidationUi) {
          this._doFakeSubmitForValidation();
        }
        this.fire('iron-form-invalid');
        return;
      }

      var json = this.serialize();

      // Native forms can also index elements magically by their name (can't make
      // this up if I tried) so we need to get the correct attributes, not the
      // elements with those names.
      this.request.url = this.getAttribute('action');
      this.request.method = this.getAttribute('method');
      this.request.contentType = this.contentType;
      this.request.withCredentials = this.withCredentials;
      this.request.headers = this.headers;

      if (this.method.toUpperCase() === 'POST') {
        this.request.body = json;
      } else {
        this.request.params = json;
      }

      // Allow for a presubmit hook
      var event = this.fire('iron-form-presubmit', {}, {cancelable: true});
      if(!event.defaultPrevented) {
        this.request.generateRequest();
        this.fire('iron-form-submit', json);
      }
    },

    /**
     * Handler that is called when the native form fires a `submit` event
     *
     * @param {Event} event A `submit` event.
     */
    _onSubmit: function(event) {
      this.submit();

      // Don't perform a page refresh.
      if (event) {
        event.preventDefault();
      }

      return false;
    },

    /**
     * Handler that is called when the native form fires a `reset` event
     *
     * @param {Event} event A `reset` event.
     */
    _onReset: function(event) {
      this._resetCustomElements();
    },

    /**
     * Returns a json object containing name/value pairs for all the registered
     * custom components and native elements of the form. If there are elements
     * with duplicate names, then their values will get aggregated into an
     * array of values.
     *
     * @return {!Object}
     */
    serialize: function() {
      var json = {};

      function addSerializedElement(el) {
        // If the name doesn't exist, add it. Otherwise, serialize it to
        // an array,
        if (!json[el.name]) {
          json[el.name] = el.value;
        } else {
          if (!Array.isArray(json[el.name])) {
            json[el.name] = [json[el.name]];
          }
          json[el.name].push(el.value);
        }
      }

      // Go through all of the registered custom components.
      for (var el, i = 0; el = this._customElements[i], i < this._customElements.length; i++) {
        if (this._useValue(el)) {
          addSerializedElement(el);
        }
      }

      // Also go through the form's native elements.
      for (var el, i = 0; el = this.elements[i], i < this.elements.length; i++) {
        // Checkboxes and radio buttons should only use their value if they're checked.
        // Also, custom elements that extend native elements (like an
        // `<input is="fancy-input">`) will appear in both lists. Since they
        // were already added as a custom element, they don't need
        // to be re-added.
        if (!this._useValue(el) ||
            (el.hasAttribute('is') && json[el.name])) {
          continue;
        }
        addSerializedElement(el);
      }

      return json;
    },

    _handleFormResponse: function (event) {
      this.fire('iron-form-response', event.detail);
    },

    _handleFormError: function (event) {
      this.fire('iron-form-error', event.detail);
    },

    _registerElement: function(e) {
      var element = e.target;
      element._parentForm = this;
      this._customElements.push(element);

      // Save the original value of this input.
      this._customElementsInitialValues.push(
          this._usesCheckedInsteadOfValue(element) ? element.checked : element.value);
    },

    _unregisterElement: function(e) {
      var target = e.detail.target;
      if (target) {
        var index = this._customElements.indexOf(target);
        if (index > -1) {
          this._customElements.splice(index, 1);
          this._customElementsInitialValues.splice(index, 1);
        }
      }
    },

    /**
     * Validates all the required elements (custom and native) in the form.
     * @return {boolean} True if all the elements are valid.
     */
    validate: function() {
      var valid = true;

      // Validate all the custom elements.
      var validatable;
      for (var el, i = 0; el = this._customElements[i], i < this._customElements.length; i++) {
        if (el.required && !el.disabled) {
          validatable = /** @type {{validate: (function() : boolean)}} */ (el);
          // Some elements may not have correctly defined a validate method.
          if (validatable.validate)
            valid = !!validatable.validate() && valid;
        }
      }

      // Validate the form's native elements.
      for (var el, i = 0; el = this.elements[i], i < this.elements.length; i++) {
        // Custom elements that extend a native element will also appear in
        // this list, but they've already been validated.
        if (!el.hasAttribute('is') && el.willValidate && el.checkValidity && el.name) {
          valid = el.checkValidity() && valid;
        }
      }

      return valid;
    },

    /**
     * Returns whether the given element is a radio-button or a checkbox.
     * @return {boolean} True if the element has a `checked` property.
     */
    _usesCheckedInsteadOfValue: function(el) {
      if (el.type == 'checkbox' ||
          el.type == 'radio' ||
          el.getAttribute('role') == 'checkbox' ||
          el.getAttribute('role') == 'radio') {
        return true;
      }
      return false;
    },

    _useValue: function(el) {
      // Skip disabled elements or elements that don't have a `name` attribute.
      if (el.disabled || !el.name) {
        return false;
      }

      // Checkboxes and radio buttons should only use their value if they're
      // checked. Custom paper-checkbox and paper-radio-button elements
      // don't have a type, but they have the correct role set.
      if (this._usesCheckedInsteadOfValue(el))
        return el.checked;
      return true;
    },

    _doFakeSubmitForValidation: function() {
      var fakeSubmit = document.createElement('input');
      fakeSubmit.setAttribute('type', 'submit');
      fakeSubmit.style.display = 'none';
      this.appendChild(fakeSubmit);

      fakeSubmit.click();

      this.removeChild(fakeSubmit);
    },

    /**
     * Resets all non-disabled form custom elements to their initial values.
     */
    _resetCustomElements: function() {
      // Reset all the registered custom components. We need to do this after
      // the native reset, since programmatically changing the `value` of some
      // native elements (iron-input in particular) does not notify its
      // parent `paper-input`, which will now display the wrong value.
      this.async(function() {
        for (var el, i = 0; el = this._customElements[i], i < this._customElements.length; i++) {
          if (el.disabled)
            continue;

          if (this._usesCheckedInsteadOfValue(el)) {
            el.checked = this._customElementsInitialValues[i];
          } else {
            el.value = this._customElementsInitialValues[i];
          }
        }

        this.fire('iron-form-reset');
      }, 1);
    }

  });
/**
   * The `iron-iconset-svg` element allows users to define their own icon sets
   * that contain svg icons. The svg icon elements should be children of the
   * `iron-iconset-svg` element. Multiple icons should be given distinct id's.
   *
   * Using svg elements to create icons has a few advantages over traditional
   * bitmap graphics like jpg or png. Icons that use svg are vector based so
   * they are resolution independent and should look good on any device. They
   * are stylable via css. Icons can be themed, colorized, and even animated.
   *
   * Example:
   *
   *     <iron-iconset-svg name="my-svg-icons" size="24">
   *       <svg>
   *         <defs>
   *           <g id="shape">
   *             <rect x="12" y="0" width="12" height="24" />
   *             <circle cx="12" cy="12" r="12" />
   *           </g>
   *         </defs>
   *       </svg>
   *     </iron-iconset-svg>
   *
   * This will automatically register the icon set "my-svg-icons" to the iconset
   * database.  To use these icons from within another element, make a
   * `iron-iconset` element and call the `byId` method
   * to retrieve a given iconset. To apply a particular icon inside an
   * element use the `applyIcon` method. For example:
   *
   *     iconset.applyIcon(iconNode, 'car');
   *
   * @element iron-iconset-svg
   * @demo demo/index.html
   * @implements {Polymer.Iconset}
   */
  Polymer({
    is: 'iron-iconset-svg',

    properties: {

      /**
       * The name of the iconset.
       */
      name: {
        type: String,
        observer: '_nameChanged'
      },

      /**
       * The size of an individual icon. Note that icons must be square.
       */
      size: {
        type: Number,
        value: 24
      }

    },

    attached: function() {
      this.style.display = 'none';
    },

    /**
     * Construct an array of all icon names in this iconset.
     *
     * @return {!Array} Array of icon names.
     */
    getIconNames: function() {
      this._icons = this._createIconMap();
      return Object.keys(this._icons).map(function(n) {
        return this.name + ':' + n;
      }, this);
    },

    /**
     * Applies an icon to the given element.
     *
     * An svg icon is prepended to the element's shadowRoot if it exists,
     * otherwise to the element itself.
     *
     * @method applyIcon
     * @param {Element} element Element to which the icon is applied.
     * @param {string} iconName Name of the icon to apply.
     * @return {?Element} The svg element which renders the icon.
     */
    applyIcon: function(element, iconName) {
      // insert svg element into shadow root, if it exists
      element = element.root || element;
      // Remove old svg element
      this.removeIcon(element);
      // install new svg element
      var svg = this._cloneIcon(iconName);
      if (svg) {
        var pde = Polymer.dom(element);
        pde.insertBefore(svg, pde.childNodes[0]);
        return element._svgIcon = svg;
      }
      return null;
    },

    /**
     * Remove an icon from the given element by undoing the changes effected
     * by `applyIcon`.
     *
     * @param {Element} element The element from which the icon is removed.
     */
    removeIcon: function(element) {
      // Remove old svg element
      if (element._svgIcon) {
        Polymer.dom(element).removeChild(element._svgIcon);
        element._svgIcon = null;
      }
    },

    /**
     *
     * When name is changed, register iconset metadata
     *
     */
    _nameChanged: function() {
      new Polymer.IronMeta({type: 'iconset', key: this.name, value: this});
      this.async(function() {
        this.fire('iron-iconset-added', this, {node: window});
      });
    },

    /**
     * Create a map of child SVG elements by id.
     *
     * @return {!Object} Map of id's to SVG elements.
     */
    _createIconMap: function() {
      // Objects chained to Object.prototype (`{}`) have members. Specifically,
      // on FF there is a `watch` method that confuses the icon map, so we
      // need to use a null-based object here.
      var icons = Object.create(null);
      Polymer.dom(this).querySelectorAll('[id]')
        .forEach(function(icon) {
          icons[icon.id] = icon;
        });
      return icons;
    },

    /**
     * Produce installable clone of the SVG element matching `id` in this
     * iconset, or `undefined` if there is no matching element.
     *
     * @return {Element} Returns an installable clone of the SVG element
     * matching `id`.
     */
    _cloneIcon: function(id) {
      // create the icon map on-demand, since the iconset itself has no discrete
      // signal to know when it's children are fully parsed
      this._icons = this._icons || this._createIconMap();
      return this._prepareSvgClone(this._icons[id], this.size);
    },

    /**
     * @param {Element} sourceSvg
     * @param {number} size
     * @return {Element}
     */
    _prepareSvgClone: function(sourceSvg, size) {
      if (sourceSvg) {
        var content = sourceSvg.cloneNode(true),
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
            viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size;
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // TODO(dfreedm): `pointer-events: none` works around https://crbug.com/370136
        // TODO(sjmiles): inline style may not be ideal, but avoids requiring a shadow-root
        svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
        svg.appendChild(content).removeAttribute('id');
        return svg;
      }
      return null;
    }

  });
/**
   * @implements {Polymer.Iconset}
   */
  Polymer({

    is: 'iron-iconset',

    properties: {

      /**
       * The URL of the iconset image.
       */
      src: {
        type: String,
        observer: '_srcChanged'
      },

      /**
       * The name of the iconset.
       */
      name: {
        type: String,
        observer: '_nameChanged'
      },

      /**
       * The width of the iconset image. This must only be specified if the
       * icons are arranged into separate rows inside the image.
       *
       * @attribute width
       * @type number
       * @default 0
       */
      width: {
        type: Number,
        value: 0
      },

      /**
       * A space separated list of names corresponding to icons in the iconset
       * image file. This list must be ordered the same as the icon images
       * in the image file.
       */
      icons: {
        type: String
      },

      /**
       * The size of an individual icon. Note that icons must be square.
       */
      size: {
        type: Number,
        value: 24
      },

      /**
       * The horizontal offset of the icon images in the inconset src image.
       * This is typically used if the image resource contains additional images
       * beside those intended for the iconset.
       */
      _offsetX: {
        type: Number,
        value: 0
      },

      /**
       * The vertical offset of the icon images in the inconset src image.
       * This is typically used if the image resource contains additional images
       * beside those intended for the iconset.
       */
      _offsetY: {
        type: Number,
        value: 0
      },

      /**
       * Array of fully-qualified names of icons in this set.
       */
      iconNames: {
        type: Array,
        notify: true
      }

    },

    hostAttributes: {
      // non-visual
      style: 'display: none;'
    },

    ready: function() {
      // theme data must exist at ready-time
      this._themes = this._mapThemes();
    },

    /**
     * Applies an icon to the given element as a css background image. This
     * method does not size the element, and it's usually necessary to set
     * the element's height and width so that the background image is visible.
     *
     * @param {Element} element The element to which the icon is applied.
     * @param {string|number} icon The name or index of the icon to apply.
     * @param {string=} theme (optional) The name or index of the icon to apply.
     * @param {number=} scale (optional, defaults to 1) Icon scaling factor.
     */
    applyIcon: function(element, icon, theme, scale) {
      this._validateIconMap();
      var offset = this._getThemedOffset(icon, theme);
      if (element && offset) {
        this._addIconStyles(element, this._srcUrl, offset, scale || 1,
          this.size, this.width);
      }
    },

    /**
     * Remove an icon from the given element by undoing the changes effected
     * by `applyIcon`.
     *
     * @param {Element} element The element from which the icon is removed.
     */
    removeIcon: function(element) {
      this._removeIconStyles(element.style);
    },

    _mapThemes: function() {
      var themes = Object.create(null);
      Polymer.dom(this).querySelectorAll('property[theme]')
        .forEach(function(property) {
          var offsetX = window.parseInt(
            property.getAttribute('offset-x'), 10
          ) || 0;
          var offsetY = window.parseInt(
            property.getAttribute('offset-y'), 10
          ) || 0;
          themes[property.getAttribute('theme')] = {
            offsetX: offsetX,
            offsetY: offsetY
          };
        });
      return themes;
    },

    _srcChanged: function(src) {
      // ensure `srcUrl` is always relative to the main document
      this._srcUrl = this.ownerDocument !== document
        ? this.resolveUrl(src) : src;
      this._prepareIconset();
    },

    _nameChanged: function(name) {
      this._prepareIconset();
    },

    _prepareIconset: function() {
      new Polymer.IronMeta({type: 'iconset', key: this.name, value: this});
      this.async(function() {
        this.fire('iron-iconset-added', this, {node: window});
      });
    },

    _invalidateIconMap: function() {
      this._iconMapValid = false;
    },

    _validateIconMap: function() {
      if (!this._iconMapValid) {
        this._recomputeIconMap();
        this._iconMapValid = true;
      }
    },

    _recomputeIconMap: function() {
      this.iconNames = this._computeIconNames(this.icons);
      this.iconMap = this._computeIconMap(this._offsetX, this._offsetY,
        this.size, this.width, this.iconNames);
    },

    _computeIconNames: function(icons) {
      return icons.split(/\s+/g);
    },

    _computeIconMap: function(offsetX, offsetY, size, width, iconNames) {
      var iconMap = {};
      if (offsetX !== undefined && offsetY !== undefined) {
        var x0 = offsetX;
        iconNames.forEach(function(iconName) {
          iconMap[iconName] = {
            offsetX: offsetX,
            offsetY: offsetY
          };
          if ((offsetX + size) < width) {
            offsetX += size;
          } else {
            offsetX = x0;
            offsetY += size;
          }
        }, this);
      }
      return iconMap;
    },

    /**
     * Returns an object containing `offsetX` and `offsetY` properties which
     * specify the pixel location in the iconset's src file for the given
     * `icon` and `theme`. It's uncommon to call this method. It is useful,
     * for example, to manually position a css backgroundImage to the proper
     * offset. It's more common to use the `applyIcon` method.
     *
     * @param {string|number} identifier The name of the icon or the index of
     * the icon within in the icon image.
     * @param {string=} theme The name of the theme.
     * @returns {?{offsetX: number, offsetY: number}} An object specifying the
     *     offset of the given icon within the icon resource file; `offsetX` is
     *     the horizontal offset and `offsetY` is the vertical offset. Both
     *     values are in pixel units.
     */
    _getThemedOffset: function(identifier, theme) {
      var iconOffset = this._getIconOffset(identifier);
      var themeOffset = this._themes[theme];
      if (iconOffset && themeOffset) {
        return {
          offsetX: iconOffset.offsetX + themeOffset.offsetX,
          offsetY: iconOffset.offsetY + themeOffset.offsetY
        };
      }
      return iconOffset;
    },

    _getIconOffset: function(identifier) {
      // TODO(sjmiles): consider creating offsetArray (indexed by Number)
      // and having iconMap map names to indices, then and index is just
      // iconMap[identifier] || identifier (be careful of zero, store indices
      // as 1-based)
      return this.iconMap[identifier] ||
             this.iconMap[this.iconNames[Number(identifier)]];
    },

    _addIconStyles: function(element, url, offset, scale, size, width) {
      var style = element.style;
      style.backgroundImage = 'url(' + url + ')';
      style.backgroundPosition =
        (-offset.offsetX * scale + 'px') + ' ' +
        (-offset.offsetY * scale + 'px');
      style.backgroundSize = (scale === 1) ? 'auto' : width * scale + 'px';
      style.width = size + 'px';
      style.height = size + 'px';
      element.setAttribute('role', 'img');
    },

    _removeIconStyles: function(style) {
      style.background = '';
    }

  });
(function() {
  "use strict";
  /**
    `Polymer.IronJsonpLibraryBehavior` loads a jsonp library.
    Multiple components can request same library, only one copy will load.

    Some libraries require a specific global function be defined.
    If this is the case, specify the `callbackName` property.

    You should use an HTML Import to load library dependencies
    when possible instead of using this element.

    @hero hero.svg
    @demo demo/index.html
    @polymerBehavior
   */
  Polymer.IronJsonpLibraryBehavior = {

    properties: {
      /**
       * True if library has been successfully loaded
       */
      libraryLoaded: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true
      },
      /**
       * Not null if library has failed to load
       */
      libraryErrorMessage: {
        type: String,
        value: null,
        notify: true,
        readOnly: true
      }
      // Following properties are to be set by behavior users
      /**
       * Library url. Must contain string `%%callback_name%%`.
       *
       * `%%callback_name%%` is a placeholder for jsonp wrapper function name
       *
       * Ex: https://maps.googleapis.com/maps/api/js?callback=%%callback%%
       * @property libraryUrl
       */
      /**
       * Set if library requires specific callback name.
       * Name will be automatically generated if not set.
       * @property callbackName
       */
      /**
       * name of event to be emitted when library loads. Standard is `api-load`
       * @property notifyEvent
       */
      /**
       * event with name specified in `notifyEvent` attribute
       * will fire upon successful load2
       * @event `notifyEvent`
       */
    },

    observers: [
      '_libraryUrlChanged(libraryUrl)'
    ],

    _libraryUrlChanged: function(libraryUrl) {
      // can't load before ready because notifyEvent might not be set
      if (this._isReady && this.libraryUrl)
        this._loadLibrary();
    },

    _libraryLoadCallback: function(err, result) {
      if (err) {
        console.warn("Library load failed:", err.message);
        this._setLibraryErrorMessage(err.message);
      }
      else {
        this._setLibraryErrorMessage(null);
        this._setLibraryLoaded(true);
        if (this.notifyEvent)
          this.fire(this.notifyEvent, result);
      }
    },

    /** loads the library, and fires this.notifyEvent upon completion */
    _loadLibrary: function() {
      LoaderMap.require(
        this.libraryUrl,
        this._libraryLoadCallback.bind(this),
        this.callbackName
      );
    },

    ready: function() {
      this._isReady = true;
      if (this.libraryUrl)
        this._loadLibrary();
    }
  };

  /**
   * LoaderMap keeps track of all Loaders
   */
  var LoaderMap = {
    apiMap: {}, // { hash -> Loader }

    /**
     * @param {Function} notifyCallback loaded callback fn(result)
     * @param {string} jsonpCallbackName name of jsonpcallback. If API does not provide it, leave empty. Optional.
     */
    require: function(url, notifyCallback, jsonpCallbackName) {

      // make hashable string form url
      var name = this.nameFromUrl(url);

      // create a loader as needed
      if (!this.apiMap[name])
        this.apiMap[name] = new Loader(name, url, jsonpCallbackName);

      // ask for notification
      this.apiMap[name].requestNotify(notifyCallback);
    },

    nameFromUrl: function(url) {
      return url.replace(/[\:\/\%\?\&\.\=\-\,]/g, '_') + '_api';
    }
  };

  /** @constructor */
  var Loader = function(name, url, callbackName) {
    this.notifiers = [];  // array of notifyFn [ notifyFn* ]

    // callback is specified either as callback name
    // or computed dynamically if url has callbackMacro in it
    if (!callbackName) {
      if (url.indexOf(this.callbackMacro) >= 0) {
        callbackName = name + '_loaded';
        url = url.replace(this.callbackMacro, callbackName);
      } else {
        this.error = new Error('IronJsonpLibraryBehavior a %%callback_name%% parameter is required in libraryUrl');
        // TODO(sjmiles): we should probably fallback to listening to script.load
        return;
      }
    }
    this.callbackName = callbackName;
    window[this.callbackName] = this.success.bind(this);
    this.addScript(url);
  };

  Loader.prototype = {

    callbackMacro: '%%callback%%',
    loaded: false,

    addScript: function(src) {
      var script = document.createElement('script');
      script.src = src;
      script.onerror = this.handleError.bind(this);
      var s = document.querySelector('script') || document.body;
      s.parentNode.insertBefore(script, s);
      this.script = script;
    },

    removeScript: function() {
      if (this.script.parentNode) {
        this.script.parentNode.removeChild(this.script);
      }
      this.script = null;
    },

    handleError: function(ev) {
      this.error = new Error("Library failed to load");
      this.notifyAll();
      this.cleanup();
    },

    success: function() {
      this.loaded = true;
      this.result = Array.prototype.slice.call(arguments);
      this.notifyAll();
      this.cleanup();
    },

    cleanup: function() {
      delete window[this.callbackName];
    },

    notifyAll: function() {
      this.notifiers.forEach( function(notifyCallback) {
        notifyCallback(this.error, this.result);
      }.bind(this));
      this.notifiers = [];
    },

    requestNotify: function(notifyCallback) {
      if (this.loaded || this.error) {
        notifyCallback( this.error, this.result);
      } else {
        this.notifiers.push(notifyCallback);
      }
    }
  };
})();
Polymer({

    is: 'iron-jsonp-library',

    behaviors: [ Polymer.IronJsonpLibraryBehavior ],

    properties: {
      /**
       * Library url. Must contain string `%%callback_name%%`.
       *
       * `%%callback_name%%` is a placeholder for jsonp wrapper function name
       *
       * Ex: https://maps.googleapis.com/maps/api/js?callback=%%callback%%
       */
      libraryUrl: String,
      /**
       * Set if library requires specific callback name.
       * Name will be automatically generated if not set.
       */
      callbackName: String,
      /**
       * event with name specified in 'notifyEvent' attribute
       * will fire upon successful load
       */
      notifyEvent: String
      /**
       * event with name specified in 'notifyEvent' attribute
       * will fire upon successful load
       * @event `notifyEvent`
       */

    }
  });
Polymer({

    is: 'iron-media-query',

    properties: {

      /**
       * The Boolean return value of the media query.
       */
      queryMatches: {
        type: Boolean,
        value: false,
        readOnly: true,
        notify: true
      },

      /**
       * The CSS media query to evaluate.
       */
      query: {
        type: String,
        observer: 'queryChanged'
      },

      /**
       * If true, the query attribute is assumed to be a complete media query
       * string rather than a single media feature.
       */
      full: {
        type: Boolean,
        value: false
      },
      
      /**
       * @type {function(MediaQueryList)}
       */ 
      _boundMQHandler: {
        value: function() {
          return this.queryHandler.bind(this);
        }
      },
      
      /**
       * @type {MediaQueryList}
       */ 
      _mq: {
        value: null
      }
    },

    attached: function() {
      this.queryChanged();
    },

    detached: function() {
      this._remove();
    },

    _add: function() {
      if (this._mq) {
        this._mq.addListener(this._boundMQHandler);
      }
    },

    _remove: function() {
      if (this._mq) {
        this._mq.removeListener(this._boundMQHandler);
      }
      this._mq = null;
    },

    queryChanged: function() {
      this._remove();
      var query = this.query;
      if (!query) {
        return;
      }
      if (!this.full && query[0] !== '(') {
        query = '(' + query + ')';
      }
      this._mq = window.matchMedia(query);
      this._add();
      this.queryHandler(this._mq);
    },

    queryHandler: function(mq) {
      this._setQueryMatches(mq.matches);
    }

  });
/**
   * @param {!Function} selectCallback
   * @constructor
   */
  Polymer.IronSelection = function(selectCallback) {
    this.selection = [];
    this.selectCallback = selectCallback;
  };

  Polymer.IronSelection.prototype = {

    /**
     * Retrieves the selected item(s).
     *
     * @method get
     * @returns Returns the selected item(s). If the multi property is true,
     * `get` will return an array, otherwise it will return
     * the selected item or undefined if there is no selection.
     */
    get: function() {
      return this.multi ? this.selection.slice() : this.selection[0];
    },

    /**
     * Clears all the selection except the ones indicated.
     *
     * @method clear
     * @param {Array} excludes items to be excluded.
     */
    clear: function(excludes) {
      this.selection.slice().forEach(function(item) {
        if (!excludes || excludes.indexOf(item) < 0) {
          this.setItemSelected(item, false);
        }
      }, this);
    },

    /**
     * Indicates if a given item is selected.
     *
     * @method isSelected
     * @param {*} item The item whose selection state should be checked.
     * @returns Returns true if `item` is selected.
     */
    isSelected: function(item) {
      return this.selection.indexOf(item) >= 0;
    },

    /**
     * Sets the selection state for a given item to either selected or deselected.
     *
     * @method setItemSelected
     * @param {*} item The item to select.
     * @param {boolean} isSelected True for selected, false for deselected.
     */
    setItemSelected: function(item, isSelected) {
      if (item != null) {
        if (isSelected) {
          this.selection.push(item);
        } else {
          var i = this.selection.indexOf(item);
          if (i >= 0) {
            this.selection.splice(i, 1);
          }
        }
        if (this.selectCallback) {
          this.selectCallback(item, isSelected);
        }
      }
    },

    /**
     * Sets the selection state for a given item. If the `multi` property
     * is true, then the selected state of `item` will be toggled; otherwise
     * the `item` will be selected.
     *
     * @method select
     * @param {*} item The item to select.
     */
    select: function(item) {
      if (this.multi) {
        this.toggle(item);
      } else if (this.get() !== item) {
        this.setItemSelected(this.get(), false);
        this.setItemSelected(item, true);
      }
    },

    /**
     * Toggles the selection state for `item`.
     *
     * @method toggle
     * @param {*} item The item to toggle.
     */
    toggle: function(item) {
      this.setItemSelected(item, !this.isSelected(item));
    }

  };
/** @polymerBehavior */
  Polymer.IronSelectableBehavior = {

      /**
       * Fired when iron-selector is activated (selected or deselected).
       * It is fired before the selected items are changed.
       * Cancel the event to abort selection.
       *
       * @event iron-activate
       */

      /**
       * Fired when an item is selected
       *
       * @event iron-select
       */

      /**
       * Fired when an item is deselected
       *
       * @event iron-deselect
       */

      /**
       * Fired when the list of selectable items changes (e.g., items are
       * added or removed). The detail of the event is a list of mutation
       * records that describe what changed.
       *
       * @event iron-items-changed
       */

    properties: {

      /**
       * If you want to use the attribute value of an element for `selected` instead of the index,
       * set this to the name of the attribute.
       */
      attrForSelected: {
        type: String,
        value: null
      },

      /**
       * Gets or sets the selected element. The default is to use the index of the item.
       */
      selected: {
        type: String,
        notify: true
      },

      /**
       * Returns the currently selected item.
       *
       * @type {?Object}
       */
      selectedItem: {
        type: Object,
        readOnly: true,
        notify: true
      },

      /**
       * The event that fires from items when they are selected. Selectable
       * will listen for this event from items and update the selection state.
       * Set to empty string to listen to no events.
       */
      activateEvent: {
        type: String,
        value: 'tap',
        observer: '_activateEventChanged'
      },

      /**
       * This is a CSS selector string.  If this is set, only items that match the CSS selector
       * are selectable.
       */
      selectable: String,

      /**
       * The class to set on elements when selected.
       */
      selectedClass: {
        type: String,
        value: 'iron-selected'
      },

      /**
       * The attribute to set on elements when selected.
       */
      selectedAttribute: {
        type: String,
        value: null
      },

      /**
       * The list of items from which a selection can be made.
       */
      items: {
        type: Array,
        readOnly: true,
        value: function() {
          return [];
        }
      },

      /**
       * The set of excluded elements where the key is the `localName`
       * of the element that will be ignored from the item list.
       *
       * @default {template: 1}
       */
      _excludedLocalNames: {
        type: Object,
        value: function() {
          return {
            'template': 1
          };
        }
      }
    },

    observers: [
      '_updateSelected(attrForSelected, selected)'
    ],

    created: function() {
      this._bindFilterItem = this._filterItem.bind(this);
      this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
    },

    attached: function() {
      this._observer = this._observeItems(this);
      this._updateItems();
      if (!this._shouldUpdateSelection) {
        this._updateSelected(this.attrForSelected,this.selected)
      }
      this._addListener(this.activateEvent);
    },

    detached: function() {
      if (this._observer) {
        Polymer.dom(this).unobserveNodes(this._observer);
      }
      this._removeListener(this.activateEvent);
    },

    /**
     * Returns the index of the given item.
     *
     * @method indexOf
     * @param {Object} item
     * @returns Returns the index of the item
     */
    indexOf: function(item) {
      return this.items.indexOf(item);
    },

    /**
     * Selects the given value.
     *
     * @method select
     * @param {string} value the value to select.
     */
    select: function(value) {
      this.selected = value;
    },

    /**
     * Selects the previous item.
     *
     * @method selectPrevious
     */
    selectPrevious: function() {
      var length = this.items.length;
      var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
      this.selected = this._indexToValue(index);
    },

    /**
     * Selects the next item.
     *
     * @method selectNext
     */
    selectNext: function() {
      var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
      this.selected = this._indexToValue(index);
    },

    get _shouldUpdateSelection() {
      return this.selected != null;
    },

    _addListener: function(eventName) {
      this.listen(this, eventName, '_activateHandler');
    },

    _removeListener: function(eventName) {
      this.unlisten(this, eventName, '_activateHandler');
    },

    _activateEventChanged: function(eventName, old) {
      this._removeListener(old);
      this._addListener(eventName);
    },

    _updateItems: function() {
      var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
      nodes = Array.prototype.filter.call(nodes, this._bindFilterItem);
      this._setItems(nodes);
    },

    _updateSelected: function() {
      this._selectSelected(this.selected);
    },

    _selectSelected: function(selected) {
      this._selection.select(this._valueToItem(this.selected));
    },

    _filterItem: function(node) {
      return !this._excludedLocalNames[node.localName];
    },

    _valueToItem: function(value) {
      return (value == null) ? null : this.items[this._valueToIndex(value)];
    },

    _valueToIndex: function(value) {
      if (this.attrForSelected) {
        for (var i = 0, item; item = this.items[i]; i++) {
          if (this._valueForItem(item) == value) {
            return i;
          }
        }
      } else {
        return Number(value);
      }
    },

    _indexToValue: function(index) {
      if (this.attrForSelected) {
        var item = this.items[index];
        if (item) {
          return this._valueForItem(item);
        }
      } else {
        return index;
      }
    },

    _valueForItem: function(item) {
      return item[this.attrForSelected] || item.getAttribute(this.attrForSelected);
    },

    _applySelection: function(item, isSelected) {
      if (this.selectedClass) {
        this.toggleClass(this.selectedClass, isSelected, item);
      }
      if (this.selectedAttribute) {
        this.toggleAttribute(this.selectedAttribute, isSelected, item);
      }
      this._selectionChange();
      this.fire('iron-' + (isSelected ? 'select' : 'deselect'), {item: item});
    },

    _selectionChange: function() {
      this._setSelectedItem(this._selection.get());
    },

    // observe items change under the given node.
    _observeItems: function(node) {
      return Polymer.dom(node).observeNodes(function(mutations) {
        // Let other interested parties know about the change so that
        // we don't have to recreate mutation observers everywher.
        this.fire('iron-items-changed', mutations, {
          bubbles: false,
          cancelable: false
        });

        this._updateItems();

        if (this._shouldUpdateSelection) {
          this._updateSelected();
        }
      });
    },

    _activateHandler: function(e) {
      var t = e.target;
      var items = this.items;
      while (t && t != this) {
        var i = items.indexOf(t);
        if (i >= 0) {
          var value = this._indexToValue(i);
          this._itemActivate(value, t);
          return;
        }
        t = t.parentNode;
      }
    },

    _itemActivate: function(value, item) {
      if (!this.fire('iron-activate',
          {selected: value, item: item}, {cancelable: true}).defaultPrevented) {
        this.select(value);
      }
    }

  };
/** @polymerBehavior Polymer.IronMultiSelectableBehavior */
  Polymer.IronMultiSelectableBehaviorImpl = {
    properties: {

      /**
       * If true, multiple selections are allowed.
       */
      multi: {
        type: Boolean,
        value: false,
        observer: 'multiChanged'
      },

      /**
       * Gets or sets the selected elements. This is used instead of `selected` when `multi`
       * is true.
       */
      selectedValues: {
        type: Array,
        notify: true
      },

      /**
       * Returns an array of currently selected items.
       */
      selectedItems: {
        type: Array,
        readOnly: true,
        notify: true
      },

    },

    observers: [
      '_updateSelected(attrForSelected, selectedValues)'
    ],

    /**
     * Selects the given value. If the `multi` property is true, then the selected state of the
     * `value` will be toggled; otherwise the `value` will be selected.
     *
     * @method select
     * @param {string} value the value to select.
     */
    select: function(value) {
      if (this.multi) {
        if (this.selectedValues) {
          this._toggleSelected(value);
        } else {
          this.selectedValues = [value];
        }
      } else {
        this.selected = value;
      }
    },

    multiChanged: function(multi) {
      this._selection.multi = multi;
    },

    get _shouldUpdateSelection() {
      return this.selected != null ||
        (this.selectedValues != null && this.selectedValues.length);
    },

    _updateSelected: function() {
      if (this.multi) {
        this._selectMulti(this.selectedValues);
      } else {
        this._selectSelected(this.selected);
      }
    },

    _selectMulti: function(values) {
      this._selection.clear();
      if (values) {
        for (var i = 0; i < values.length; i++) {
          this._selection.setItemSelected(this._valueToItem(values[i]), true);
        }
      }
    },

    _selectionChange: function() {
      var s = this._selection.get();
      if (this.multi) {
        this._setSelectedItems(s);
      } else {
        this._setSelectedItems([s]);
        this._setSelectedItem(s);
      }
    },

    _toggleSelected: function(value) {
      var i = this.selectedValues.indexOf(value);
      var unselected = i < 0;
      if (unselected) {
        this.push('selectedValues',value);
      } else {
        this.splice('selectedValues',i,1);
      }
      this._selection.setItemSelected(this._valueToItem(value), unselected);
    }
  };

  /** @polymerBehavior */
  Polymer.IronMultiSelectableBehavior = [
    Polymer.IronSelectableBehavior,
    Polymer.IronMultiSelectableBehaviorImpl
  ];
/**
   * `Polymer.IronMenuBehavior` implements accessible menu behavior.
   *
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronMenuBehavior
   */
  Polymer.IronMenuBehaviorImpl = {

    properties: {

      /**
       * Returns the currently focused item.
       * @type {?Object}
       */
      focusedItem: {
        observer: '_focusedItemChanged',
        readOnly: true,
        type: Object
      },

      /**
       * The attribute to use on menu items to look up the item title. Typing the first
       * letter of an item when the menu is open focuses that item. If unset, `textContent`
       * will be used.
       */
      attrForItemTitle: {
        type: String
      }
    },

    hostAttributes: {
      'role': 'menu',
      'tabindex': '0'
    },

    observers: [
      '_updateMultiselectable(multi)'
    ],

    listeners: {
      'focus': '_onFocus',
      'keydown': '_onKeydown',
      'iron-items-changed': '_onIronItemsChanged'
    },

    keyBindings: {
      'up': '_onUpKey',
      'down': '_onDownKey',
      'esc': '_onEscKey',
      'shift+tab:keydown': '_onShiftTabDown'
    },

    attached: function() {
      this._resetTabindices();
    },

    /**
     * Selects the given value. If the `multi` property is true, then the selected state of the
     * `value` will be toggled; otherwise the `value` will be selected.
     *
     * @param {string} value the value to select.
     */
    select: function(value) {
      if (this._defaultFocusAsync) {
        this.cancelAsync(this._defaultFocusAsync);
        this._defaultFocusAsync = null;
      }
      var item = this._valueToItem(value);
      if (item && item.hasAttribute('disabled')) return;
      this._setFocusedItem(item);
      Polymer.IronMultiSelectableBehaviorImpl.select.apply(this, arguments);
    },

    /**
     * Resets all tabindex attributes to the appropriate value based on the
     * current selection state. The appropriate value is `0` (focusable) for
     * the default selected item, and `-1` (not keyboard focusable) for all
     * other items.
     */
    _resetTabindices: function() {
      var selectedItem = this.multi ? (this.selectedItems && this.selectedItems[0]) : this.selectedItem;

      this.items.forEach(function(item) {
        item.setAttribute('tabindex', item === selectedItem ? '0' : '-1');
      }, this);
    },

    /**
     * Sets appropriate ARIA based on whether or not the menu is meant to be
     * multi-selectable.
     *
     * @param {boolean} multi True if the menu should be multi-selectable.
     */
    _updateMultiselectable: function(multi) {
      if (multi) {
        this.setAttribute('aria-multiselectable', 'true');
      } else {
        this.removeAttribute('aria-multiselectable');
      }
    },

    /**
     * Given a KeyboardEvent, this method will focus the appropriate item in the
     * menu (if there is a relevant item, and it is possible to focus it).
     *
     * @param {KeyboardEvent} event A KeyboardEvent.
     */
    _focusWithKeyboardEvent: function(event) {
      for (var i = 0, item; item = this.items[i]; i++) {
        var attr = this.attrForItemTitle || 'textContent';
        var title = item[attr] || item.getAttribute(attr);
        if (title && title.trim().charAt(0).toLowerCase() === String.fromCharCode(event.keyCode).toLowerCase()) {
          this._setFocusedItem(item);
          break;
        }
      }
    },

    /**
     * Focuses the previous item (relative to the currently focused item) in the
     * menu.
     */
    _focusPrevious: function() {
      var length = this.items.length;
      var index = (Number(this.indexOf(this.focusedItem)) - 1 + length) % length;
      this._setFocusedItem(this.items[index]);
    },

    /**
     * Focuses the next item (relative to the currently focused item) in the
     * menu.
     */
    _focusNext: function() {
      var index = (Number(this.indexOf(this.focusedItem)) + 1) % this.items.length;
      this._setFocusedItem(this.items[index]);
    },

    /**
     * Mutates items in the menu based on provided selection details, so that
     * all items correctly reflect selection state.
     *
     * @param {Element} item An item in the menu.
     * @param {boolean} isSelected True if the item should be shown in a
     * selected state, otherwise false.
     */
    _applySelection: function(item, isSelected) {
      if (isSelected) {
        item.setAttribute('aria-selected', 'true');
      } else {
        item.removeAttribute('aria-selected');
      }

      Polymer.IronSelectableBehavior._applySelection.apply(this, arguments);
    },

    /**
     * Discretely updates tabindex values among menu items as the focused item
     * changes.
     *
     * @param {Element} focusedItem The element that is currently focused.
     * @param {?Element} old The last element that was considered focused, if
     * applicable.
     */
    _focusedItemChanged: function(focusedItem, old) {
      old && old.setAttribute('tabindex', '-1');
      if (focusedItem) {
        focusedItem.setAttribute('tabindex', '0');
        focusedItem.focus();
      }
    },

    /**
     * A handler that responds to mutation changes related to the list of items
     * in the menu.
     *
     * @param {CustomEvent} event An event containing mutation records as its
     * detail.
     */
    _onIronItemsChanged: function(event) {
      var mutations = event.detail;
      var mutation;
      var index;

      for (index = 0; index < mutations.length; ++index) {
        mutation = mutations[index];

        if (mutation.addedNodes.length) {
          this._resetTabindices();
          break;
        }
      }
    },

    /**
     * Handler that is called when a shift+tab keypress is detected by the menu.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onShiftTabDown: function(event) {
      var oldTabIndex;

      Polymer.IronMenuBehaviorImpl._shiftTabPressed = true;

      oldTabIndex = this.getAttribute('tabindex');

      this.setAttribute('tabindex', '-1');

      this.async(function() {
        this.setAttribute('tabindex', oldTabIndex);
        Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
      // NOTE(cdata): polymer/polymer#1305
      }, 1);
    },

    /**
     * Handler that is called when the menu receives focus.
     *
     * @param {FocusEvent} event A focus event.
     */
    _onFocus: function(event) {
      if (Polymer.IronMenuBehaviorImpl._shiftTabPressed) {
        return;
      }
      // do not focus the menu itself
      this.blur();
      // clear the cached focus item
      this._setFocusedItem(null);
      this._defaultFocusAsync = this.async(function() {
        // focus the selected item when the menu receives focus, or the first item
        // if no item is selected
        var selectedItem = this.multi ? (this.selectedItems && this.selectedItems[0]) : this.selectedItem;
        if (selectedItem) {
          this._setFocusedItem(selectedItem);
        } else {
          this._setFocusedItem(this.items[0]);
        }
      // async 100ms to wait for `select` to get called from `_itemActivate`
      }, 100);
    },

    /**
     * Handler that is called when the up key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onUpKey: function(event) {
      // up and down arrows moves the focus
      this._focusPrevious();
    },

    /**
     * Handler that is called when the down key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onDownKey: function(event) {
      this._focusNext();
    },

    /**
     * Handler that is called when the esc key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onEscKey: function(event) {
      // esc blurs the control
      this.focusedItem.blur();
    },

    /**
     * Handler that is called when a keydown event is detected.
     *
     * @param {KeyboardEvent} event A keyboard event.
     */
    _onKeydown: function(event) {
      if (this.keyboardEventMatchesKeys(event, 'up down esc')) {
        return;
      }

      // all other keys focus the menu item starting with that character
      this._focusWithKeyboardEvent(event);
    }
  };

  Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;

  /** @polymerBehavior Polymer.IronMenuBehavior */
  Polymer.IronMenuBehavior = [
    Polymer.IronMultiSelectableBehavior,
    Polymer.IronA11yKeysBehavior,
    Polymer.IronMenuBehaviorImpl
  ];
/**
   * `Polymer.IronMenubarBehavior` implements accessible menubar behavior.
   *
   * @polymerBehavior Polymer.IronMenubarBehavior
   */
  Polymer.IronMenubarBehaviorImpl = {

    hostAttributes: {
      'role': 'menubar'
    },

    keyBindings: {
      'left': '_onLeftKey',
      'right': '_onRightKey'
    },

    _onUpKey: function(event) {
      this.focusedItem.click();
      event.detail.keyboardEvent.preventDefault();
    },

    _onDownKey: function(event) {
      this.focusedItem.click();
      event.detail.keyboardEvent.preventDefault();
    },

    _onLeftKey: function() {
      this._focusPrevious();
    },

    _onRightKey: function() {
      this._focusNext();
    },

    _onKeydown: function(event) {
      if (this.keyboardEventMatchesKeys(event, 'up down left right esc')) {
        return;
      }

      // all other keys focus the menu item starting with that character
      this._focusWithKeyboardEvent(event);
    }

  };

  /** @polymerBehavior Polymer.IronMenubarBehavior */
  Polymer.IronMenubarBehavior = [
    Polymer.IronMenuBehavior,
    Polymer.IronMenubarBehaviorImpl
  ];
/**
 * `iron-range-behavior` provides the behavior for something with a minimum to maximum range.
 *
 * @demo demo/index.html
 * @polymerBehavior
 */
 Polymer.IronRangeBehavior = {

  properties: {

    /**
     * The number that represents the current value.
     */
    value: {
      type: Number,
      value: 0,
      notify: true,
      reflectToAttribute: true
    },

    /**
     * The number that indicates the minimum value of the range.
     */
    min: {
      type: Number,
      value: 0,
      notify: true
    },

    /**
     * The number that indicates the maximum value of the range.
     */
    max: {
      type: Number,
      value: 100,
      notify: true
    },

    /**
     * Specifies the value granularity of the range's value.
     */
    step: {
      type: Number,
      value: 1,
      notify: true
    },

    /**
     * Returns the ratio of the value.
     */
    ratio: {
      type: Number,
      value: 0,
      readOnly: true,
      notify: true
    },
  },

  observers: [
    '_update(value, min, max, step)'
  ],

  _calcRatio: function(value) {
    return (this._clampValue(value) - this.min) / (this.max - this.min);
  },

  _clampValue: function(value) {
    return Math.min(this.max, Math.max(this.min, this._calcStep(value)));
  },

  _calcStep: function(value) {
   /**
    * if we calculate the step using
    * `Math.round(value / step) * step` we may hit a precision point issue
    * eg. 0.1 * 0.2 =  0.020000000000000004
    * http://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
    *
    * as a work around we can divide by the reciprocal of `step`
    */
    // polymer/issues/2493
    value = parseFloat(value);
    return this.step ? (Math.round((value + this.min) / this.step) -
        (this.min / this.step)) / (1 / this.step) : value;
  },

  _validateValue: function() {
    var v = this._clampValue(this.value);
    this.value = this.oldValue = isNaN(v) ? this.oldValue : v;
    return this.value !== v;
  },

  _update: function() {
    this._validateValue();
    this._setRatio(this._calcRatio(this.value) * 100);
  }

};
/**
  `iron-selector` is an element which can be used to manage a list of elements
  that can be selected.  Tapping on the item will make the item selected.  The `selected` indicates
  which item is being selected.  The default is to use the index of the item.

  Example:

      <iron-selector selected="0">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </iron-selector>

  If you want to use the attribute value of an element for `selected` instead of the index,
  set `attrForSelected` to the name of the attribute.  For example, if you want to select item by
  `name`, set `attrForSelected` to `name`.

  Example:

      <iron-selector attr-for-selected="name" selected="foo">
        <div name="foo">Foo</div>
        <div name="bar">Bar</div>
        <div name="zot">Zot</div>
      </iron-selector>

  `iron-selector` is not styled. Use the `iron-selected` CSS class to style the selected element.

  Example:

      <style>
        .iron-selected {
          background: #eee;
        }
      </style>

      ...

      <iron-selector selected="0">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </iron-selector>

  @demo demo/index.html
  */

  Polymer({

    is: 'iron-selector',

    behaviors: [
      Polymer.IronMultiSelectableBehavior
    ]

  });
(function(){
/**
`iron-signals` provides basic publish-subscribe functionality.

Note: avoid using `iron-signals` whenever you can use
a controller (parent element) to mediate communication
instead.

To send a signal, fire a custom event of type `iron-signal`, with
a detail object containing `name` and `data` fields.

    this.fire('iron-signal', {name: 'hello', data: null});

To receive a signal, listen for `iron-signal-<name>` event on a
`iron-signals` element.

  <iron-signals on-iron-signal-hello="{{helloSignal}}">

You can fire a signal event from anywhere, and all
`iron-signals` elements will receive the event, regardless
of where they are in DOM.

@demo demo/index.html
*/
  Polymer({
    is: 'iron-signals',

    attached: function() {
      signals.push(this);
    },
    detached: function() {
      var i = signals.indexOf(this);
      if (i >= 0) {
        signals.splice(i, 1);
      }
    }
  });

  // private shared database
  var signals = [];

  // signal dispatcher
  function notify(name, data) {
    // convert generic-signal event to named-signal event
    var signal = new CustomEvent('iron-signal-' + name, {
      // if signals bubble, it's easy to get confusing duplicates
      // (1) listen on a container on behalf of local child
      // (2) some deep child ignores the event and it bubbles
      //     up to said container
      // (3) local child event bubbles up to container
      // also, for performance, we avoid signals flying up the
      // tree from all over the place
      bubbles: false,
      detail: data
    });
    // dispatch named-signal to all 'signals' instances,
    // only interested listeners will react
    signals.forEach(function(s) {
      s.dispatchEvent(signal);
    });
  }

  // signal listener at document
  document.addEventListener('iron-signal', function(e) {
    notify(e.detail.name, e.detail.data);
  });

})();
/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(global) {
  'use strict';

  var HAS_NEW_MOUSE = (function() {
    var has = false;
    try {
      has = Boolean(new MouseEvent('x'));
    } catch (_) {}
    return has;
  })();

  function middleOfNode(node) {
    var bcr = node.getBoundingClientRect();
    return {
      y: bcr.top + (bcr.height / 2),
      x: bcr.left + (bcr.width / 2)
    };
  }

  function topLeftOfNode(node) {
    var bcr = node.getBoundingClientRect();
    return {
      y: bcr.top,
      x: bcr.left
    };
  }

  function makeEvent(type, xy, node) {
    var props = {
      bubbles: true,
      cancelable: true,
      clientX: xy.x,
      clientY: xy.y,
      // Make this a primary input.
      buttons: 1 // http://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
    };
    var e;
    var mousetype = type === 'tap' ? 'click' : 'mouse' + type;
    if (HAS_NEW_MOUSE) {
      e = new MouseEvent(mousetype, props);
    } else {
      e = document.createEvent('MouseEvent');
      e.initMouseEvent(
        mousetype, props.bubbles, props.cancelable,
        null, /* view */
        null, /* detail */
        0,    /* screenX */
        0,    /* screenY */
        props.clientX, props.clientY,
        false, /*ctrlKey */
        false, /*altKey */
        false, /*shiftKey */
        false, /*metaKey */
        0,     /*button */
        null   /*relatedTarget*/);
    }
    node.dispatchEvent(e);
  }

  function down(node, xy) {
    xy = xy || middleOfNode(node);
    makeEvent('down', xy, node);
  }

  function move(node, fromXY, toXY, steps) {
    steps = steps || 5;
    var dx = Math.round((fromXY.x - toXY.x) / steps);
    var dy = Math.round((fromXY.y - toXY.y) / steps);
    var xy = {
      x: fromXY.x,
      y: fromXY.y
    };
    for (var i = steps; i > 0; i--) {
      makeEvent('move', xy, node);
      xy.x += dx;
      xy.y += dy;
    }
    makeEvent('move', {
      x: toXY.x,
      y: toXY.y
    }, node);
  }

  function up(node, xy) {
    xy = xy || middleOfNode(node);
    makeEvent('up', xy, node);
  }

  function tap(node) {
    // Respect nodes that are disabled in the UI.
    if (window.getComputedStyle(node)['pointer-events'] === 'none')
      return;
    var xy = middleOfNode(node);
    down(node, xy);
    up(node, xy);
    makeEvent('tap', xy, node);
  }

  function focus(target) {
    Polymer.Base.fire.call(target, 'focus', {}, {
      bubbles: false
    });
  }

  function blur(target) {
    Polymer.Base.fire.call(target, 'blur', {}, {
      bubbles: false
    });
  }

  function downAndUp(target, callback) {
    down(target);
    Polymer.Base.async(function() {
      up(target);
      tap(target);

      callback && callback();
    });
  }

  function track(target, dx, dy, steps) {
    dx = dx | 0;
    dy = dy | 0;
    steps = steps || 5;
    down(target);
    var xy = middleOfNode(target);
    var xy2 = {
      x: xy.x + dx,
      y: xy.y + dy
    };
    move(target, xy, xy2, steps);
    up(target, xy2);
  }

  function keyboardEventFor(type, keyCode) {
    var event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true
    });

    event.keyCode = keyCode;
    event.code = keyCode;

    return event;
  }

  function keyEventOn(target, type, keyCode) {
    target.dispatchEvent(keyboardEventFor(type, keyCode));
  }

  function keyDownOn(target, keyCode) {
    keyEventOn(target, 'keydown', keyCode);
  }

  function keyUpOn(target, keyCode) {
    keyEventOn(target, 'keyup', keyCode);
  }

  function pressAndReleaseKeyOn(target, keyCode) {
    keyDownOn(target, keyCode);
    Polymer.Base.async(function() {
      keyUpOn(target, keyCode);
    }, 1);
  }

  function pressEnter(target) {
    pressAndReleaseKeyOn(target, 13);
  }

  function pressSpace(target) {
    pressAndReleaseKeyOn(target, 32);
  }

  global.MockInteractions = {
    focus: focus,
    blur: blur,
    down: down,
    up: up,
    downAndUp: downAndUp,
    tap: tap,
    track: track,
    pressAndReleaseKeyOn: pressAndReleaseKeyOn,
    pressEnter: pressEnter,
    pressSpace: pressSpace,
    keyDownOn: keyDownOn,
    keyUpOn: keyUpOn,
    middleOfNode: middleOfNode,
    topLeftOfNode: topLeftOfNode
  };
})(this);
/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
(function(global) {

  global.flushAsynchronousOperations = function() {
    // force distribution
    Polymer.dom.flush();
    // force lifecycle callback to fire on polyfill
    window.CustomElements && window.CustomElements.takeRecords();
  };

  global.forceXIfStamp = function(node) {
    var templates = Polymer.dom(node.root).querySelectorAll('template[is=dom-if]');
    for (var tmpl, i = 0; tmpl = templates[i]; i++) {
      tmpl.render();
    }

    global.flushAsynchronousOperations();
  };

  global.fireEvent = function(type, props, node) {
    var event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true
    });
    for (p in props) {
      event[p] = props[p];
    }
    node.dispatchEvent(event);
  };

})(this);
(function(global) {
    'use strict';

    var TestHelpers = global.TestHelpers = global.TestHelpers || {};

    TestHelpers.flushAsynchronousOperations = flushAsynchronousOperations;
    TestHelpers.forceXIfStamp = forceXIfStamp;
    TestHelpers.fireEvent = fireEvent;
  })(this);
Polymer({

    is: 'cascaded-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    properties: {

      /** @type {!Polymer.IronMeta} */
      _animationMeta: {
        type: Object,
        value: function() {
          return new Polymer.IronMeta({type: 'animation'});
        }
      }

    },

    /**
     * @param {{
     *   animation: string,
     *   nodes: !Array<!Element>,
     *   nodeDelay: (number|undefined),
     *   timing: (Object|undefined)
     *  }} config
     */
    configure: function(config) {
      var animationConstructor = /** @type {Function} */ (
          this._animationMeta.byKey(config.animation));
      if (!animationConstructor) {
        console.warn(this.is + ':', 'constructor for', config.animation, 'not found!');
        return;
      }

      this._animations = [];
      var nodes = config.nodes;
      var effects = [];
      var nodeDelay = config.nodeDelay || 50;

      config.timing = config.timing || {};
      config.timing.delay = config.timing.delay || 0;

      var oldDelay = config.timing.delay;
      for (var node, index = 0; node = nodes[index]; index++) {
        config.timing.delay += nodeDelay;
        config.node = node;

        var animation = new animationConstructor();
        var effect = animation.configure(config);

        this._animations.push(animation);
        effects.push(effect);
      }
      config.timing.delay = oldDelay;

      this._effect = new GroupEffect(effects);
      return this._effect;
    },

    complete: function() {
      for (var animation, index = 0; animation = this._animations[index]; index++) {
        animation.complete(animation.config);
      }
    }

  });
Polymer({

    is: 'fade-in-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      this._effect = new KeyframeEffect(node, [
        {'opacity': '0'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      return this._effect;
    }

  });
Polymer({

    is: 'fade-out-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '0'}
      ], this.timingFromConfig(config));
      return this._effect;
    }

  });
/**
   * Use `Polymer.NeonSharedElementAnimationBehavior` to implement shared element animations.
   * @polymerBehavior Polymer.NeonSharedElementAnimationBehavior
   */
  Polymer.NeonSharedElementAnimationBehaviorImpl = {

    properties: {

      /**
       * Cached copy of shared elements.
       */
      sharedElements: {
        type: Object
      }

    },

    /**
     * Finds shared elements based on `config`.
     */
    findSharedElements: function(config) {
      var fromPage = config.fromPage;
      var toPage = config.toPage;
      if (!fromPage || !toPage) {
        console.warn(this.is + ':', !fromPage ? 'fromPage' : 'toPage', 'is undefined!');
        return null;
      };

      if (!fromPage.sharedElements || !toPage.sharedElements) {
        console.warn(this.is + ':', 'sharedElements are undefined for', !fromPage.sharedElements ? fromPage : toPage);
        return null;
      };

      var from = fromPage.sharedElements[config.id]
      var to = toPage.sharedElements[config.id];

      if (!from || !to) {
        console.warn(this.is + ':', 'sharedElement with id', config.id, 'not found in', !from ? fromPage : toPage);
        return null;
      }

      this.sharedElements = {
        from: from,
        to: to
      };
      return this.sharedElements;
    }

  };

  /** @polymerBehavior Polymer.NeonSharedElementAnimationBehavior */
  Polymer.NeonSharedElementAnimationBehavior = [
    Polymer.NeonAnimationBehavior,
    Polymer.NeonSharedElementAnimationBehaviorImpl
  ];
Polymer({

    is: 'hero-animation',

    behaviors: [
      Polymer.NeonSharedElementAnimationBehavior
    ],

    configure: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return;
      }

      var fromRect = shared.from.getBoundingClientRect();
      var toRect = shared.to.getBoundingClientRect();

      var deltaLeft = fromRect.left - toRect.left;
      var deltaTop = fromRect.top - toRect.top;
      var deltaWidth = fromRect.width / toRect.width;
      var deltaHeight = fromRect.height / toRect.height;

      this.setPrefixedProperty(shared.to, 'transformOrigin', '0 0');
      shared.to.style.zIndex = 10000;
      shared.from.style.visibility = 'hidden';

      this._effect = new KeyframeEffect(shared.to, [
        {'transform': 'translate(' + deltaLeft + 'px,' + deltaTop + 'px) scale(' + deltaWidth + ',' + deltaHeight + ')'},
        {'transform': 'none'}
      ], this.timingFromConfig(config));

      return this._effect;
    },

    complete: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return null;
      }
      shared.to.style.zIndex = '';
      shared.from.style.visibility = '';
    }

  });
Polymer({

    is: 'ripple-animation',

    behaviors: [
      Polymer.NeonSharedElementAnimationBehavior
    ],

    configure: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return null;
      }

      var translateX, translateY;
      var toRect = shared.to.getBoundingClientRect();
      if (config.gesture) {
        translateX = config.gesture.x - (toRect.left + (toRect.width / 2));
        translateY = config.gesture.y - (toRect.top + (toRect.height / 2));
      } else {
        var fromRect = shared.from.getBoundingClientRect();
        translateX = (fromRect.left + (fromRect.width / 2)) - (toRect.left + (toRect.width / 2));
        translateY = (fromRect.top + (fromRect.height / 2)) - (toRect.top + (toRect.height / 2));
      }
      var translate = 'translate(' + translateX + 'px,' + translateY + 'px)';

      var size = Math.max(toRect.width + Math.abs(translateX) * 2, toRect.height + Math.abs(translateY) * 2);
      var diameter = Math.sqrt(2 * size * size);
      var scaleX = diameter / toRect.width;
      var scaleY = diameter / toRect.height;
      var scale = 'scale(' + scaleX + ',' + scaleY + ')';

      this.setPrefixedProperty(shared.to, 'transformOrigin', '50% 50%');
      shared.to.style.borderRadius = '50%';

      this._effect = new KeyframeEffect(shared.to, [
        {'transform': translate + ' scale(0)'},
        {'transform': translate + ' ' + scale}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function() {
      if (this.sharedElements) {
        this.setPrefixedProperty(this.sharedElements.to, 'transformOrigin', '');
        this.sharedElements.to.style.borderRadius = '';
      }
    }

  });
Polymer({
    is: 'reverse-ripple-animation',

    behaviors: [
      Polymer.NeonSharedElementAnimationBehavior
    ],

    configure: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return null;
      }

      var translateX, translateY;
      var fromRect = shared.from.getBoundingClientRect();
      if (config.gesture) {
        translateX = config.gesture.x - (fromRect.left + (fromRect.width / 2));
        translateY = config.gesture.y - (fromRect.top + (fromRect.height / 2));
      } else {
        var toRect = shared.to.getBoundingClientRect();
        translateX = (toRect.left + (toRect.width / 2)) - (fromRect.left + (fromRect.width / 2));
        translateY = (toRect.top + (toRect.height / 2)) - (fromRect.top + (fromRect.height / 2));
      }
      var translate = 'translate(' + translateX + 'px,' + translateY + 'px)';

      var size = Math.max(fromRect.width + Math.abs(translateX) * 2, fromRect.height + Math.abs(translateY) * 2);
      var diameter = Math.sqrt(2 * size * size);
      var scaleX = diameter / fromRect.width;
      var scaleY = diameter / fromRect.height;
      var scale = 'scale(' + scaleX + ',' + scaleY + ')';

      this.setPrefixedProperty(shared.from, 'transformOrigin', '50% 50%');
      shared.from.style.borderRadius = '50%';

      this._effect = new KeyframeEffect(shared.from, [
        {'transform': translate + ' ' + scale},
        {'transform': translate + ' scale(0)'}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function() {
      if (this.sharedElements) {
        this.setPrefixedProperty(this.sharedElements.from, 'transformOrigin', '');
        this.sharedElements.from.style.borderRadius = '';
      }
    }
  });
Polymer({

    is: 'scale-down-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      }

      var scaleProperty = 'scale(0, 0)';
      if (config.axis === 'x') {
        scaleProperty = 'scale(0, 1)';
      } else if (config.axis === 'y') {
        scaleProperty = 'scale(1, 0)';
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'scale(1,1)'},
        {'transform': scaleProperty}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'scale-up-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      }

      var scaleProperty = 'scale(0)';
      if (config.axis === 'x') {
        scaleProperty = 'scale(0, 1)';
      } else if (config.axis === 'y') {
        scaleProperty = 'scale(1, 0)';
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': scaleProperty},
        {'transform': 'scale(1, 1)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-from-left-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateX(-100%)'},
        {'transform': 'none'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-from-right-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateX(100%)'},
        {'transform': 'none'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-left-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'none'},
        {'transform': 'translateX(-100%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-right-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'none'},
        {'transform': 'translateX(100%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-up-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '50% 0');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translate(0)'},
        {'transform': 'translateY(-100%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-down-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '50% 0');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateY(-100%)'},
        {'transform': 'none'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'transform-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    /**
     * @param {{
     *   node: !Element,
     *   transformOrigin: (string|undefined),
     *   transformFrom: (string|undefined),
     *   transformTo: (string|undefined),
     *   timing: (Object|undefined)
     * }} config
     */
    configure: function(config) {
      var node = config.node;
      var transformFrom = config.transformFrom || 'none';
      var transformTo = config.transformTo || 'none';

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': transformFrom},
        {'transform': transformTo}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
/**
   * Use `Polymer.NeonSharedElementAnimatableBehavior` to implement elements containing shared element
   * animations.
   * @polymerBehavior Polymer.NeonSharedElementAnimatableBehavior
   */
  Polymer.NeonSharedElementAnimatableBehaviorImpl = {

    properties: {

      /**
       * A map of shared element id to node.
       */
      sharedElements: {
        type: Object,
        value: {}
      }

    }

  };

  /** @polymerBehavior Polymer.NeonSharedElementAnimatableBehavior */
  Polymer.NeonSharedElementAnimatableBehavior = [
    Polymer.NeonAnimatableBehavior,
    Polymer.NeonSharedElementAnimatableBehaviorImpl
  ];
/**
   * `Polymer.PaperInkyFocusBehavior` implements a ripple when the element has keyboard focus.
   *
   * @polymerBehavior Polymer.PaperInkyFocusBehavior
   */
  Polymer.PaperInkyFocusBehaviorImpl = {

    observers: [
      '_focusedChanged(receivedFocusFromKeyboard)'
    ],

    _focusedChanged: function(receivedFocusFromKeyboard) {
      if (receivedFocusFromKeyboard) {
        this.ensureRipple();
      }
      if (this.hasRipple()) {
        this._ripple.holdDown = receivedFocusFromKeyboard;
      }
    },

    _createRipple: function() {
      var ripple = Polymer.PaperRippleBehavior._createRipple();
      ripple.id = 'ink';
      ripple.setAttribute('center', '');
      ripple.classList.add('circle');
      return ripple;
    }

  };

  /** @polymerBehavior Polymer.PaperInkyFocusBehavior */
  Polymer.PaperInkyFocusBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperRippleBehavior,
    Polymer.PaperInkyFocusBehaviorImpl
  ];
/**
   * Use `Polymer.PaperCheckedElementBehavior` to implement a custom element
   * that has a `checked` property similar to `Polymer.IronCheckedElementBehavior`
   * and is compatible with having a ripple effect.
   * @polymerBehavior Polymer.PaperCheckedElementBehavior
   */
  Polymer.PaperCheckedElementBehaviorImpl = {

    /**
     * Synchronizes the element's checked state with its ripple effect.
     */
    _checkedChanged: function() {
      Polymer.IronCheckedElementBehaviorImpl._checkedChanged.call(this);
      if (this.hasRipple()) {
        if (this.checked) {
          this._ripple.setAttribute('checked', '');
        } else {
          this._ripple.removeAttribute('checked');
        }
      }
    },

    /**
     * Synchronizes the element's `active` and `checked` state.
     */
    _buttonStateChanged: function() {
      Polymer.PaperRippleBehavior._buttonStateChanged.call(this);
      if (this.disabled) {
        return;
      }
      if (this.isAttached) {
        this.checked = this.active;
      }
    }

  };

  /** @polymerBehavior Polymer.PaperCheckedElementBehavior */
  Polymer.PaperCheckedElementBehavior = [
    Polymer.PaperInkyFocusBehavior,
    Polymer.IronCheckedElementBehavior,
    Polymer.PaperCheckedElementBehaviorImpl
  ];
/**
Use `Polymer.PaperDialogBehavior` and `paper-dialog-common.css` to implement a Material Design
dialog.

For example, if `<paper-dialog-impl>` implements this behavior:

    <paper-dialog-impl>
        <h2>Header</h2>
        <div>Dialog body</div>
        <div class="buttons">
            <paper-button dialog-dismiss>Cancel</paper-button>
            <paper-button dialog-confirm>Accept</paper-button>
        </div>
    </paper-dialog-impl>

`paper-dialog-common.css` provide styles for a header, content area, and an action area for buttons.
Use the `<h2>` tag for the header and the `buttons` class for the action area. You can use the
`paper-dialog-scrollable` element (in its own repository) if you need a scrolling content area.

Use the `dialog-dismiss` and `dialog-confirm` attributes on interactive controls to close the
dialog. If the user dismisses the dialog with `dialog-confirm`, the `closingReason` will update
to include `confirmed: true`.

### Styling

The following custom properties and mixins are available for styling.

Custom property | Description | Default
----------------|-------------|----------
`--paper-dialog-background-color` | Dialog background color                     | `--primary-background-color`
`--paper-dialog-color`            | Dialog foreground color                     | `--primary-text-color`
`--paper-dialog`                  | Mixin applied to the dialog                 | `{}`
`--paper-dialog-title`            | Mixin applied to the title (`<h2>`) element | `{}`
`--paper-dialog-button-color`     | Button area foreground color                | `--default-primary-color`

### Accessibility

This element has `role="dialog"` by default. Depending on the context, it may be more appropriate
to override this attribute with `role="alertdialog"`.

If `modal` is set, the element will set `aria-modal` and prevent the focus from exiting the element.
It will also ensure that focus remains in the dialog.

The `aria-labelledby` attribute will be set to the header element, if one exists.

@hero hero.svg
@demo demo/index.html
@polymerBehavior Polymer.PaperDialogBehavior
*/

  Polymer.PaperDialogBehaviorImpl = {

    hostAttributes: {
      'role': 'dialog',
      'tabindex': '-1'
    },

    properties: {

      /**
       * If `modal` is true, this implies `no-cancel-on-outside-click` and `with-backdrop`.
       */
      modal: {
        observer: '_modalChanged',
        type: Boolean,
        value: false
      },

      /** @type {?Node} */
      _lastFocusedElement: {
        type: Object
      },

      _boundOnFocus: {
        type: Function,
        value: function() {
          return this._onFocus.bind(this);
        }
      },

      _boundOnBackdropClick: {
        type: Function,
        value: function() {
          return this._onBackdropClick.bind(this);
        }
      }

    },

    listeners: {
      'tap': '_onDialogClick',
      'iron-overlay-opened': '_onIronOverlayOpened',
      'iron-overlay-closed': '_onIronOverlayClosed'
    },

    attached: function() {
      this._observer = this._observe(this);
      this._updateAriaLabelledBy();
    },

    detached: function() {
      if (this._observer) {
        this._observer.disconnect();
      }
    },

    _observe: function(node) {
      var observer = new MutationObserver(function() {
        this._updateAriaLabelledBy();
      }.bind(this));
      observer.observe(node, {
        childList: true,
        subtree: true
      });
      return observer;
    },

    _modalChanged: function() {
      if (this.modal) {
        this.setAttribute('aria-modal', 'true');
      } else {
        this.setAttribute('aria-modal', 'false');
      }
      // modal implies noCancelOnOutsideClick and withBackdrop if true, don't overwrite
      // those properties otherwise.
      if (this.modal) {
        this.noCancelOnOutsideClick = true;
        this.withBackdrop = true;
      }
    },

    _updateAriaLabelledBy: function() {
      var header = Polymer.dom(this).querySelector('h2');
      if (!header) {
        this.removeAttribute('aria-labelledby');
        return;
      }
      var headerId = header.getAttribute('id');
      if (headerId && this.getAttribute('aria-labelledby') === headerId) {
        return;
      }
      // set aria-describedBy to the header element
      var labelledById;
      if (headerId) {
        labelledById = headerId;
      } else {
        labelledById = 'paper-dialog-header-' + new Date().getUTCMilliseconds();
        header.setAttribute('id', labelledById);
      }
      this.setAttribute('aria-labelledby', labelledById);
    },

    _updateClosingReasonConfirmed: function(confirmed) {
      this.closingReason = this.closingReason || {};
      this.closingReason.confirmed = confirmed;
    },

    _onDialogClick: function(event) {
      var target = event.target;
      while (target && target !== this) {
        if (target.hasAttribute) {
          if (target.hasAttribute('dialog-dismiss')) {
            this._updateClosingReasonConfirmed(false);
            this.close();
            break;
          } else if (target.hasAttribute('dialog-confirm')) {
            this._updateClosingReasonConfirmed(true);
            this.close();
            break;
          }
        }
        target = target.parentNode;
      }
    },

    _onIronOverlayOpened: function() {
      if (this.modal) {
        document.body.addEventListener('focus', this._boundOnFocus, true);
        this.backdropElement.addEventListener('click', this._boundOnBackdropClick);
      }
    },

    _onIronOverlayClosed: function() {
      document.body.removeEventListener('focus', this._boundOnFocus, true);
      this.backdropElement.removeEventListener('click', this._boundOnBackdropClick);
    },

    _onFocus: function(event) {
      if (this.modal) {
        var target = event.target;
        while (target && target !== this && target !== document.body) {
          target = target.parentNode;
        }
        if (target) {
          if (target === document.body) {
            if (this._lastFocusedElement) {
              this._lastFocusedElement.focus();
            } else {
              this._focusNode.focus();
            }
          } else {
            this._lastFocusedElement = event.target;
          }
        }
      }
    },

    _onBackdropClick: function() {
      if (this.modal) {
        if (this._lastFocusedElement) {
          this._lastFocusedElement.focus();
        } else {
          this._focusNode.focus();
        }
      }
    }

  };

  /** @polymerBehavior */
  Polymer.PaperDialogBehavior = [Polymer.IronOverlayBehavior, Polymer.PaperDialogBehaviorImpl];
Polymer({
    is: 'paper-menu-grow-height-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var height = rect.height;

      this._effect = new KeyframeEffect(node, [{
        height: (height / 2) + 'px'
      }, {
        height: height + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-grow-width-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var width = rect.width;

      this._effect = new KeyframeEffect(node, [{
        width: (width / 2) + 'px'
      }, {
        width: width + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-shrink-width-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var width = rect.width;

      this._effect = new KeyframeEffect(node, [{
        width: width + 'px'
      }, {
        width: width - (width / 20) + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-shrink-height-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var height = rect.height;
      var top = rect.top;

      this.setPrefixedProperty(node, 'transformOrigin', '0 0');

      this._effect = new KeyframeEffect(node, [{
        height: height + 'px',
        transform: 'translateY(0)'
      }, {
        height: height / 2 + 'px',
        transform: 'translateY(-20px)'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });
(function() {
    'use strict';

    // This allows us to use BluetoothDevice related attributes type in
    // browsers where it is not defined.
    if (!('BluetoothDevice' in window)) {
      window.BluetoothDevice = {};
    }

    // This allows us to use BluetoothGATTRemoteServer related attributes type
    // in browsers where it is not defined.
    if (!('BluetoothGATTRemoteServer' in window)) {
      window.BluetoothGATTRemoteServer = {};
    }

    // This allows us to use BluetoothGATTService related attributes type in
    // browsers where it is not defined.
    if (!('BluetoothGATTService' in window)) {
      window.BluetoothGATTService = {};
    }

    // This allows us to use BluetoothGATTCharacteristic related attributes
    // type in browsers where it is not defined.
    if (!('BluetoothGATTCharacteristic' in window)) {
      window.BluetoothGATTCharacteristic = {};
    }

    /**
     * The `<platinum-bluetooth-characteristic>` element allows you to [read
     * and write characteristics on nearby bluetooth devices][1] thanks to the
     * young [Web Bluetooth API][2]. It is currently only partially implemented
     * in Chrome OS 45 behind the experimental flag
     * `chrome://flags/#enable-web-bluetooth`.
     *
     * `<platinum-bluetooth-characteristic>` needs to be a child of a
     * `<platinum-bluetooth-device>` element.
     *
     * For instance, here's how to read battery level from a nearby bluetooth
     * device advertising Battery service:
     *
     * ```html
     * <platinum-bluetooth-device services-filter='["battery_service"]'>
     *   <platinum-bluetooth-characteristic
     *       service='battery_service'
     *       characteristic='battery_level'>
     *   </platinum-bluetooth-characteristic>
     * </platinum-bluetooth-device>
     * ```
     * ```js
     * var bluetoothDevice = document.querySelector('platinum-bluetooth-device');
     * var batteryLevel = document.querySelector('platinum-bluetooth-characteristic');
     *
     * button.addEventListener('click', function() {
     *   bluetoothDevice.request().then(function() {
     *     return batteryLevel.read().then(function(value) {
     *       var data = new DataView(value);
     *       console.log('Battery Level is ' + data.getUint8(0) + '%');
     *     });
     *   })
     *   .catch(function(error) { });
     * });
     * ```
     *
     * Here's another example on how to reset energy expended on nearby
     * bluetooth device advertising Heart Rate service:
     *
     * ```html
     * <platinum-bluetooth-device services-filter='["heart_rate"]'>
     *   <platinum-bluetooth-characteristic
     *       service='heart_rate'
     *       characteristic='heart_rate_control_point'>
     *   </platinum-bluetooth-characteristic>
     * </platinum-bluetooth-device>
     * ```
     * ```js
     * var bluetoothDevice = document.querySelector('platinum-bluetooth-device');
     * var heartRateCtrlPoint = document.querySelector('platinum-bluetooth-characteristic');
     *
     * button.addEventListener('click', function() {
     *   bluetoothDevice.request().then(function() {
     *     // Writing 1 is the signal to reset energy expended.
     *     var resetEnergyExpended = new Uint8Array([1]);
     *     return heartRateCtrlPoint.write(resetEnergyExpended).then(function() {
     *       console.log('Energy expended has been reset');
     *     });
     *   })
     *   .catch(function(error) { });
     * });
     * ```
     *
     * It is also possible for `<platinum-bluetooth-characteristic>` to fill in
     * a data-bound field in response to a read.
     *
     * ```html
     * <platinum-bluetooth-device services-filter='["heart_rate"]'>
     *   <platinum-bluetooth-characteristic
     *       service='heart_rate'
     *       characteristic='body_sensor_location'
     *       value={{bodySensorLocation}}>
     *   </platinum-bluetooth-characteristic>
     * </platinum-bluetooth-device>
     * ...
     * <span>{{bodySensorLocation}}</span>
     * ```
     * ```js
     * var bluetoothDevice = document.querySelector('platinum-bluetooth-device');
     * var bodySensorLocation = document.querySelector('platinum-bluetooth-characteristic');
     *
     * button.addEventListener('click', function() {
     *   bluetoothDevice.request().then(function() {
     *     return bodySensorLocation.read()
     *   })
     *   .catch(function(error) { });
     * });
     * ```
     *
     * You can also use changes in `value` to drive characteristic writes when
     * `auto-write` property is set to true.
     *
     * ```html
     * <platinum-bluetooth-device services-filter='["heart_rate"]'>
     *   <platinum-bluetooth-characteristic
     *       service='heart_rate'
     *       characteristic='heart_rate_control_point'
     *       auto-write>
     *   </platinum-bluetooth-characteristic>
     * </platinum-bluetooth-device>
     * ```
     * ```js
     * var bluetoothDevice = document.querySelector('platinum-bluetooth-device');
     * var heartRateCtrlPoint = document.querySelector('platinum-bluetooth-characteristic');
     *
     * button.addEventListener('click', function() {
     *   bluetoothDevice.request().then(function() {
     *     // Writing 1 is the signal to reset energy expended.
     *     heartRateCtrlPoint.value = new Uint8Array([1]);
     *   })
     *   .catch(function(error) { });
     * });
     *
     * heartRateCtrlPoint.addEventListener('platinum-bluetooth-auto-write-error',
     *     function(event) {
     *   // Handle error...
     * });
     * ```
     *
     * [1]: https://developers.google.com/web/updates/2015/07/interact-with-ble-devices-on-the-web
     * [2]: https://github.com/WebBluetoothCG/web-bluetooth
     *
     * @hero hero.svg
     * @demo demo/
     */

    Polymer({

      is: 'platinum-bluetooth-characteristic',

      properties: {

        /**
         * Required Bluetooth GATT primary service. You may provide either the
         * full Bluetooth UUID as a string or a short 16- or 32-bit form as
         * integers like 0x180d.
         */
        service: {
          type: String,
          observer: '_serviceChanged'
        },

        /**
         * Required Bluetooth GATT characteristic for read and write operations.
         * You may provide either the full Bluetooth UUID as a string or a
         * short 16- or 32-bit form as integers like 0x2A19.
         */
        characteristic: {
          type: String,
          observer: '_characteristicChanged'
        },

        /**
          * Value gets populated with the characteristic value when it's read.
         */
        value: {
          type: ArrayBuffer,
          observer: '_valueChanged',
          notify: true
        },

        /**
         * If true, automatically perform a write `value` on the characteristic
         * when `value` changes.
         */
        autoWrite: {
          type: Boolean,
          reflectToAttribute: true,
          value: false
        },

        /**
         * Internal variable used that represents the Bluetooth device.
         */
        _device: {
          type: BluetoothDevice
        },

        /**
         * Internal variable used to cache Bluetooth GATT remote server.
         */
        _server: {
          readOnly: true,
          type: BluetoothGATTRemoteServer
        },

        /**
         * Internal variable used to cache Bluetooth GATT primary service.
         */
        _service: {
          readOnly: true,
          type: BluetoothGATTService
        },

        /**
         * Internal variable used to cache Bluetooth GATT characteristic.
         */
        _characteristic: {
          readOnly: true,
          type: BluetoothGATTCharacteristic
        },

      },

      /**
       * Fired when an error occurs while writing automatically to a characteristic.
       *
       * @event platinum-bluetooth-auto-write-error
       * @param {String} The error message
       */

      /**
       * Returns a promise that will resolve when bluetooth device picked by
       * user is connected.
       *
       * @return {Promise<BluetoothGATTRemoteServer>}
       */
      _connectToDevice: function() {
        if (this._server) {
          // Resolve promise if device is already connected.
          return Promise.resolve(this._server);
        }
        if (!this._device) {
          return Promise.reject(new Error('Bluetooth device is not connected.'));
        }
        var self = this;
        return this._device.connectGATT()
          .then(function(server) {
            self._set_server(server);
            return self._server;
          });
      },

      /**
       * Returns a promise that will resolve when Bluetooth GATT Primary
       * Service is discovered.
       *
       * @return {Promise<BluetoothGATTService>}
       */
      _getPrimaryService: function() {
        if (this._service &&
            this._service.uuid === BluetoothUUID.getService(this.service)) {
          // Resolve promise if primary service is already discovered.
          return Promise.resolve(this._service);
        }
        if (!this._server || !this._server.connected) {
          return Promise.reject(new Error('Bluetooth GATT Remote server is not connected.'));
        }
        if (!this.service) {
          return Promise.reject(new Error('Bluetooth GATT Primary Service is mandatory.'));
        }
        var self = this;
        return this._server.getPrimaryService(this.service)
          .then(function(service) {
            if (!service) {
              throw new Error('Bluetooth GATT Primary Service not found.');
            }
            self._set_service(service);
            return self._service;
          });
      },

      /**
       * Returns a promise that will resolve when Bluetooth GATT Characteristic
       * is discovered.
       *
       * @return {Promise<BluetoothGATTCharacteristic>}
       */
      _getCharacteristic: function() {
        if (this._characteristic &&
            this._characteristic.uuid === BluetoothUUID.getCharacteristic(this.characteristic)) {
          // Resolve promise if characteristic is already _.
          return Promise.resolve(this._characteristic);
        }
        if (!this._service) {
          return Promise.reject(new Error('Bluetooth GATT Primary Service is not connected.'));
        }
        if (!this.characteristic) {
          return Promise.reject(new Error('Bluetooth GATT Characteristic is mandatory.'));
        }
        var self = this;
        return this._service.getCharacteristic(this.characteristic)
          .then(function(characteristic) {
            self._set_characteristic(characteristic);
            return self._characteristic;
          });
      },

      /**
       * Returns a promise that will resolve when Bluetooth GATT Characteristic
       * is read.
       *
       * @return {Promise<ArrayBuffer>}
       */
      _readCharacteristic: function() {
        if (!this._characteristic) {
          return Promise.reject(new Error('Bluetooth GATT Characteristic is not connected.'));
        }
        var self = this;
        return this._characteristic.readValue()
          .then(function(value) {
            self.value = value;
            return self.value;
          });
      },

      /**
       * Returns a promise that will resolve when Bluetooth GATT Characteristic
       * is written.
       *
       * @param value {BufferSource (ArrayBufferView|ArrayBuffer)}
       * @return {Promise<void>}
       */
      _writeCharacteristic: function(value) {
        if (!this._characteristic) {
          return Promise.reject(new Error('Bluetooth GATT Characteristic is not connected.'));
        }
        return this._characteristic.writeValue(value);
      },

      /**
       * Reset internal cache when service property is changed.
       */
      _serviceChanged: function() {
        this._set_service(null);
        this._set_characteristic(null);
      },

      /**
       * Reset internal cache when characteristic property is changed.
       */
      _characteristicChanged: function() {
        this._set_characteristic(null);
      },

      /**
       * Automatically write value when auto-write property is true and value
       * changed.
       */
      _valueChanged: function() {
        if (this.autoWrite) {
          var self = this;
          this.write(this.value).catch(function(error) {
            self.fire('platinum-bluetooth-auto-write-error', error.message || error);
          });
        }
      },

      /**
       * Returns a promise that will resolve when Bluetooth GATT Characteristic
       * is read.
       *
       * @return {Promise<ArrayBuffer>} The value of this Bluetooth GATT Characteristic.
       */
      read: function() {
        var self = this;
        return this._connectToDevice()
          .then(function() { return self._getPrimaryService() })
          .then(function() { return self._getCharacteristic() })
          .then(function() { return self._readCharacteristic() })
      },

      /**
       * Returns a promise that will resolve when Bluetooth GATT Characteristic
       * is written.
       *
       * @param {(ArrayBufferView|ArrayBuffer)} value The value to write.
       * @return {Promise}
       */
      write: function(value) {
        var self = this;
        return this._connectToDevice()
          .then(function() { return self._getPrimaryService() })
          .then(function() { return self._getCharacteristic() })
          .then(function() { return self._writeCharacteristic(value) })
      },

    });
  })();
Promise.all = Promise.all || function () {
  var args = Array.prototype.slice.call(arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : arguments);

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([]);
    var remaining = args.length;
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then;
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject);
            return;
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex);
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.race = Promise.race || function (values) {
  return new Promise(function (resolve, reject) {
    for(var i = 0, len = values.length; i < len; i++) {
      values[i].then(resolve, reject);
    }
  });
};
(function() {
    'use strict';
    // TODO: Doesn't work for IE or Safari, and the usual
    // document.getElementsByTagName('script') workaround seems to be broken by
    // HTML imports. Not important for now as neither of those browsers support
    // service worker yet.
    var currentScript = (document.currentScript || {}).baseURI;

    var SCOPE = new URL('./$$platinum-push-messaging$$/', currentScript).href;
    var WORKER_URL = new URL('./service-worker.js', currentScript).href;

    var BASE_URL = new URL('./', document.location.href).href;

    var SUPPORTED = 'serviceWorker' in navigator &&
        'PushManager' in window  &&
        'Notification' in window;

    /**
     * @const {Number} The desired version of the service worker to use. This is
     * not strictly tied to anything except that it should be changed whenever
     * a breaking change is made to the service worker code.
     */
    var VERSION = 1;

    // This allows us to use the PushSubscription attribute type in browsers
    // where it is not defined.
    if (!('PushSubscription' in window)) {
      window.PushSubscription = {};
    }

    /**
     * `<platinum-push-messaging>` sets up a [push messaging][1] subscription
     * and allows you to define what happens when a push message is received.
     *
     * The element can be placed anywhere, but should only be used once in a
     * page. If there are multiple occurrences, only one will be active.
     *
     * # Sample
     *
     * For a complete sample that uses the element, see the [Cat Push
     * Notifications][3] project.
     *
     * # Requirements
     * Push messaging is currently only available in Google Chrome, which
     * requires you to configure Google Cloud Messaging. Chrome will check that
     * your page links to a manifest file that contains a `gcm_sender_id` field.
     * You can find full details of how to set all of this up in the [HTML5
     * Rocks guide to push notifications][1].
     *
     * # Notification details
     * The data for how a notification should be displayed can come from one of
     * three places.
     *
     * Firstly, you can specify a URL from which to fetch the message data.
     * ```
     * <platinum-push-messaging
     *   message-url="notification-data.json">
     * </platinum-push-messaging>
     * ```
     *
     * The second way is to send the message data in the body of
     * the push message from your server. In this case you do not need to
     * configure anything in your page:
     * ```
     * <platinum-push-messaging></platinum-push-messaging>
     * ```
     * **Note that this method is not currently supported by any browser**. It
     * is, however, defined in the
     * [draft W3C specification](http://w3c.github.io/push-api/#the-push-event)
     * and this element should use that data when it is implemented in the
     * future.
     *
     * If a message-url is provided then the message body will be ignored in
     * favor of the first method.
     *
     * Thirdly, you can manually define the attributes on the element:
     * ```
     * <platinum-push-messaging
     *   title="Application updated"
     *   message="The application was updated in the background"
     *   icon-url="icon.png"
     *   click-url="notification.html">
     * </platinum-push-messaging>
     * ```
     * These values will also be used as defaults if one of the other methods
     * does not provide a value for that property.
     *
     * # Testing
     * If you have set up Google Cloud Messaging then you can send push messages
     * to your browser by following the guide in the [GCM documentation][2].
     *
     * However, for quick client testing there are two options. You can use the
     * `testPush` method, which allows you to simulate a push message that
     * includes a payload.
     *
     * Or, at a lower level, you can open up chrome://serviceworker-internals in
     * Chrome and use the 'Push' button for the service worker corresponding to
     * your app.
     *
     * [1]: http://updates.html5rocks.com/2015/03/push-notificatons-on-the-open-web
     * [2]: https://developer.android.com/google/gcm/http.html
     * [3]: https://github.com/notwaldorf/caturday-post
     *
     * @demo demo/
     */
    Polymer({
      is: 'platinum-push-messaging',

      properties: {

        /**
         * Indicates whether the Push and Notification APIs are supported by
         * this browser.
         */
        supported: {
          readOnly: true,
          type: Boolean,
          value: SUPPORTED
        },

        /**
         * The details of the current push subscription, if any.
         */
        subscription: {
          readOnly: true,
          type: PushSubscription,
          notify: true,
        },

        /**
         * Indicates the status of the element. If true, push messages will be
         * received.
         */
        enabled: {
          readOnly: true,
          type: Boolean,
          notify: true,
          value: false
        },


        /**
         * A URL from which message information can be retrieved.
         *
         * When a push event happens that does not contain a message body this
         * URL will be fetched. The document will be parsed as JSON, and should
         * result in an object.
         *
         * The valid keys for the object are `title`, `message`, `url`, `icon`,
         * `tag`, `dir`, `lang`, `noscreen`, `renotify`, `silent`, `sound`,
         * `sticky` and `vibrate`. For documentation of these values see the
         * attributes of the same names, except that these values override the
         * element attributes.
         */
        messageUrl: String,

        /**
         * The default notification title.
         */
        title: String,

        /**
         * The default notification message.
         */
        message: String,

        /**
         * A default tag for the notifications that will be generated by
         * this element. Notifications with the same tag will overwrite one
         * another, so that only one will be shown at once.
         */
        tag: String,

        /**
         * The URL of a default icon for notifications.
         */
        iconUrl: String,

        /**
         * The default text direction for the title and body of the
         * notification. Can be `auto`, `ltr` or `rtl`.
         */
        dir: {
          type: String,
          value: 'auto'
        },

        /**
         * The default language to assume for the title and body of the
         * notification. If set this must be a valid
         * [BCP 47](https://tools.ietf.org/html/bcp47) language tag.
         */
        lang: String,

        /**
         * If true then displaying the notification should not turn the device's
         * screen on.
         */
        noscreen: {
          type: Boolean,
          value: false
        },

        /**
         * When a notification is displayed that has the same `tag` as an
         * existing notification, the existing one will be replaced. If this
         * flag is true then such a replacement will cause the user to be
         * alerted as though it were a new notification, by vibration or sound
         * as appropriate.
         */
        renotify: {
          type: Boolean,
          value: false
        },

        /**
         * If true then displaying the notification should not cause any
         * vibration or sound to be played.
         */
        silent: {
          type: Boolean,
          value: false
        },

        /**
         * If true then the notification should be sticky, meaning that it is
         * not directly dismissable.
         */
        sticky: {
          type: Boolean,
          value: false
        },

        /**
         * The pattern of vibration that should be used by default when a
         * notification is displayed. See
         */
        vibrate: Array,

        /**
         * The URL of a default sound file to play when a notification is shown.
         */
        sound: String,

        /**
         * The default URL to display when a notification is clicked.
         */
        clickUrl: {
          type: String,
          value: document.location.href
        },
      },

      /**
       * Fired when a notification is clicked that had the current page as the
       * click URL.
       *
       * @event platinum-push-messaging-click
       * @param {Object} The push message data used to create the notification
       */

      /**
       * Fired when a push message is received but no notification is shown.
       * This happens when the click URL is for this page and the page is
       * visible to the user on the screen.
       *
       * @event platinum-push-messaging-push
       * @param {Object} The push message data that was received
       */

      /**
       * Fired when an error occurs while enabling or disabling notifications
       *
       * @event platinum-push-messaging-error
       * @param {String} The error message
       */

      /**
       * Returns a promise which will resolve to the registration object
       * associated with our current service worker.
       *
       * @return {Promise<ServiceWorkerRegistration>}
       */
      _getRegistration: function() {
        return navigator.serviceWorker.getRegistration(SCOPE);
      },

      /**
       * Returns a promise that will resolve when the given registration becomes
       * active.
       *
       * @param registration {ServiceWorkerRegistration}
       * @return {Promise<undefined>}
       */
      _registrationReady: function(registration) {
        if (registration.active) {
          return Promise.resolve();
        }

        var serviceWorker = registration.installing || registration.waiting;

        return new Promise(function(resolve, reject) {
          // Because the Promise function is called on next tick there is a
          // small chance that the worker became active already.
          if (serviceWorker.state === 'activated') {
            resolve();
          }
          var listener = function(event) {
            if (serviceWorker.state === 'activated') {
              resolve();
            } else if (serviceWorker.state === 'redundant') {
              reject(new Error('Worker became redundant'));
            } else {
              return;
            }
            serviceWorker.removeEventListener('statechange', listener);
          };
          serviceWorker.addEventListener('statechange', listener);
        });
      },

      /**
       * Event handler for the `message` event.
       *
       * @param event {MessageEvent}
       */
      _messageHandler: function(event) {
        if (event.data && event.data.source === SCOPE) {
          switch(event.data.type) {
          case 'push':
            this.fire('platinum-push-messaging-push', event.data);
            break;
          case 'click':
            this.fire('platinum-push-messaging-click', event.data);
            break;
          }
        }
      },

      /**
       * Takes an options object and creates a stable JSON serialization of it.
       * This naive algorithm will only work if the object contains only
       * non-nested properties.
       *
       * @param options {Object.<String, ?(String|Number|Boolean)>}
       * @return String
       */
      _serializeOptions: function(options) {
        var props = Object.keys(options);
        props.sort();
        var parts = props.filter(function(propName) {
          return !!options[propName];
        }).map(function(propName) {
          return JSON.stringify(propName) + ':' + JSON.stringify(options[propName]);
        });
        return encodeURIComponent('{' + parts.join(',') + '}');
      },

      /**
       * Determine the URL of the worker based on the currently set parameters
       *
       * @return String the URL
       */
      _getWorkerURL: function() {
        var options = this._serializeOptions({
          tag: this.tag,
          messageUrl: this.messageUrl,
          title: this.title,
          message: this.message,
          iconUrl: this.iconUrl,
          clickUrl: this.clickUrl,
          dir: this.dir,
          lang: this.lang,
          noscreen: this.noscreen,
          renotify: this.renotify,
          silent: this.silent,
          sound: this.sound,
          sticky: this.sticky,
          vibrate: this.vibrate,
          version: VERSION,
          baseUrl: BASE_URL
        });

        return WORKER_URL + '?' + options;
      },

      /**
       * Update the subscription property, but only if the value has changed.
       * This prevents triggering the subscription-changed event twice on page
       * load.
       */
      _updateSubscription: function(subscription) {
        if (JSON.stringify(subscription) !== JSON.stringify(this.subscription)) {
          this._setSubscription(subscription);
        }
      },

      /**
       * Programmatically trigger a push message
       *
       * @param message {Object} the message payload
       */
      testPush: function(message) {
        this._getRegistration().then(function(registration) {
          registration.active.postMessage({
            type: 'test-push',
            message: message
          });
        });
      },

      /**
       * Request push messaging to be enabled.
       *
       * @return {Promise<undefined>}
       */
      enable: function() {
        if (!this.supported) {
          this.fire('platinum-push-messaging-error', 'Your browser does not support push notifications');
          return Promise.resolve();
        }

        return navigator.serviceWorker.register(this._getWorkerURL(), {scope: SCOPE}).then(function(registration) {
          return this._registrationReady(registration).then(function() {
            return registration.pushManager.subscribe({userVisibleOnly: true});
          });
        }.bind(this)).then(function(subscription) {
          this._updateSubscription(subscription);
          this._setEnabled(true);
        }.bind(this)).catch(function(error) {
          this.fire('platinum-push-messaging-error', error.message || error);
        }.bind(this));
      },

      /**
       * Request push messaging to be disabled.
       *
       * @return {Promise<undefined>}
       */
      disable: function() {
        if (!this.supported) {
          return Promise.resolve();
        }

        return this._getRegistration().then(function(registration) {
          if (!registration) {
            return;
          }
          return registration.pushManager.getSubscription().then(function(subscription) {
            if (subscription) {
              return subscription.unsubscribe();
            }
          }).then(function() {
            return registration.unregister();
          }).then(function() {
            this._updateSubscription();
            this._setEnabled(false);
          }.bind(this)).catch(function(error) {
            this.fire('platinum-push-messaging-error', error.message || error);
          }.bind(this));
        }.bind(this));
      },

      ready: function() {
        if (this.supported) {
          var handler = this._messageHandler.bind(this);
          // NOTE: We add the event listener twice because the specced and
          // implemented behaviors do not match. In Chrome 42, messages are
          // received on window. In the current spec they are supposed to be
          // received on navigator.serviceWorker.
          // TODO: Remove the non-spec code in the future.
          window.addEventListener('message', handler);
          navigator.serviceWorker.addEventListener('message', handler);

          this._getRegistration().then(function(registration) {
            if (!registration) {
              return;
            }
            if (registration.active && registration.active.scriptURL !== this._getWorkerURL()) {
              // We have an existing worker in this scope, but it is out of date
              return this.enable();
            }
            return registration.pushManager.getSubscription().then(function(subscription) {
              this._updateSubscription(subscription);
              this._setEnabled(true);
            }.bind(this));
          }.bind(this));
        }
      }
    });
  })();
/**
   * The `<platinum-sw-cache>` element makes it easy to precache specific resources, perform runtime
   * caching, and serve your cached resources when a network is unavailable.
   * Under the hood, the [sw-toolbox](https://github.com/googlechrome/sw-toolbox) library is used
   * for all the caching and request handling logic.
   * `<platinum-sw-cache>` needs to be a child element of `<platinum-sw-register>`.
   * A simple, yet useful configuration is
   *
   *     <platinum-sw-register auto-register>
   *       <platinum-sw-cache></platinum-sw-cache>
   *     </platinum-sw-register>
   *
   * This is enough to have all of the resources your site uses cached at runtime, both local and
   * cross-origin.
   * (It uses the default `defaultCacheStrategy` of "networkFirst".)
   * When there's a network available, visits to your site will go against the network copy of the
   * resources, but if someone visits your site when they're offline, all the cached resources will
   * be used.
   *
   * @demo demo/index.html An offline-capable eReader demo.
   */
  Polymer({
    is: 'platinum-sw-cache',

    properties: {
      /**
       * Used to configure `<platinum-sw-precache>` behavior via a JSON file instead of via
       * attributes. This can come in handy when the configuration (e.g. which files to precache)
       * depends on the results of a build script.
       *
       * If configuration for the same properties are provided in both the JSON file and via the
       * element's attributes, then in general the JSON file's values take precedence. The one
       * exception is the `precache` property. Any values in the element's `precache` attribute will
       * be concatenated with the values in the JSON file's `precache` property and the set of files
       * that are precached will be the union of the two.
       *
       * There's one additional option, `precacheFingerprint`, that can be set in the JSON. If using
       * a build script that might output a large number of files to precache, its recommended
       * that your build script generate a unique "fingerprint" of the files. Any changes to the
       * `precacheFingerprint` value will result in the underlying service worker kicking off the
       * process of caching the files listed in `precache`.
       * While there are a few different strategies for generating an appropriate
       * `precacheFingerprint` value, a process that makes sense is to use a stable hash of the
       * serialized `precache` array. That way, any changes to the list of files in `precache`
       * will result in a new `precacheFingerprint` value.
       * If your build script is Node.js based, one way to generate this hash is:
       *
       *     var md5 = require('crypto').createHash('md5');
       *     md5.update(JSON.stringify(precache));
       *     var precacheFingerprint = md5.digest('hex');
       *
       * Alternatively, you could use something like the
       * [SHA-1 signature](http://stackoverflow.com/questions/1161869/how-to-get-sha-of-the-latest-commit-from-remote-git-repository)
       * of your latest `git` commit for the `precacheFingerprint` value.
       *
       * An example file may look like:
       *
       *     {
       *       "cacheId": "my-cache-id",
       *       "defaultCacheStrategy": "fastest",
       *       "disabled": false,
       *       "precache": ["file1.html", "file2.css"],
       *       "precacheFingerprint": "FINGERPRINT_OF_FILES_IN_PRECACHE"
       *     }
       */
      cacheConfigFile: String,

      /**
       * An id used to construct the name for the
       * [Cache](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#cache)
       * in which all the resources will be stored.
       *
       * If nothing is provided, the default value set in
       * [`toolbox.options.cacheName`](https://github.com/GoogleChrome/sw-toolbox/blob/8763dcc9fbc9352d58f184050e2131c42f7b6d68/lib/options.js#L28)
       * will be used.
       *
       * The `cacheId` is combined with the service worker's scope to construct the cache name, so
       * two `<platinum-sw-cache>` elements that are associated with different scopes will use
       * different caches.
       */
      cacheId: String,

      /**
       * The caching strategy used for all requests, both for local and cross-origin resources.
       *
       * For a list of strategies, see the [`sw-toolbox` documentation](https://github.com/GoogleChrome/sw-toolbox#built-in-handlers).
       * Specify a strategy as a string, without the "toolbox" prefix. E.g., for
       * `toolbox.networkFirst`, set `defaultCacheStrategy` to "networkFirst".
       *
       * Note that the "cacheFirst" and "cacheOnly" strategies are not recommended, and may be
       * explicitly prevented in a future release. More information can be found at
       * https://github.com/PolymerElements/platinum-sw#cacheonly--cachefirst-defaultcachestrategy-considered-harmful
       *
       * @see {@link https://github.com/GoogleChrome/sw-toolbox#built-in-handlers}
       */
      defaultCacheStrategy: {
        type: String,
        value: 'networkFirst'
      },

      /**
       * If set to true, this element will not set up service worker caching. This is useful to
       * conditionally enable or disable caching depending on the build environment.
       */
      disabled: {
        type: Boolean,
        value: false
      },

      /**
       * Used to provide a list of URLs that are always precached as soon as the service worker is
       * installed. Corresponds to  [`sw-toolbox`'s `precache()` method](https://github.com/GoogleChrome/sw-toolbox#toolboxprecachearrayofurls).
       *
       * This is useful for URLs that that wouldn't necessarily be picked up by runtime caching,
       * i.e. a list of resources that are needed by one of the subpages of your site, or a list of
       * resources that are only loaded via user interaction.
       *
       * `precache` can be used in conjunction with `cacheConfigFile`, and the two arrays will be
       * concatenated.
       *
       * @see {@link https://github.com/GoogleChrome/sw-toolbox#toolboxprecachearrayofurls}
       */
      precache: {
        type: Array,
        value: function() { return []; }
      }
    },

    _getParameters: function(baseURI) {
      return new Promise(function(resolve) {
        var params = {
          importscriptLate: new URL('bootstrap/sw-toolbox-setup.js', baseURI).href,
          defaultCacheStrategy: this.defaultCacheStrategy,
          precache: this.precache
        };

        if (this.cacheConfigFile) {
          params.cacheConfigFile = this.cacheConfigFile;
          window.fetch(this.cacheConfigFile).then(function(response) {
            if (!response.ok) {
              throw Error('unable to load ' + this.cacheConfigFile);
            }
            return response.json();
          }.bind(this)).then(function(config) {
            this.disabled = config.disabled;
            if (this.disabled) {
              // Use an empty set of parameters to effectively disable caching.
              params = {};
            } else {
              // If there's a hash of the list of files to precache provided in the config file,
              // then copy that over to the params that will be used to construct the service worker
              // URL. This works around the issue where a potentially large number of precache
              // files could result in a longer URL than a browser will allow.
              // The actual list of files to precache (in config.precache) will be dealt by the
              // service worker during the install phase, so we can ignore it here.
              // See https://github.com/PolymerElements/platinum-sw/issues/53
              if (config.precacheFingerprint) {
                params.precacheFingerprint = config.precacheFingerprint;
              } else {
                params.precache = params.precache.concat(config.precache);
              }
              params.cacheId = config.cacheId || params.cacheId;
              params.defaultCacheStrategy = config.defaultCacheStrategy ||
                params.defaultCacheStrategy;
            }
          }.bind(this)).catch(function(error) {
            console.info('Skipping precaching: ' + error.message);
          }).then(function() {
            resolve(params);
          });
        } else {
          resolve(params);
        }
      }.bind(this));
    }
  });
/**
   * The `<platinum-sw-fetch>` element creates custom [`fetch` event](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#fetch-event-section)
   * handlers for given URL patterns. Possible use cases include:
   *
   * - Using a special caching strategy for specific URLs.
   * - Returning static "fallback" responses instead of network errors when a remote API
   * is unavailable.
   *
   * In short, any scenario in which you'd like a service worker to intercept network
   * requests and provide custom response handling.
   *
   * If you'd like a single caching policy applied to all same-origin requests, then an alternative
   * to using `<platinum-sw-fetch>` is to use `<platinum-sw-cache>` with the `defaultCacheStategy`
   * property set.
   *
   * Under the hood, the [sw-toolbox](https://github.com/googlechrome/sw-toolbox) library is used
   * for all the request handling logic.
   *
   * `<platinum-sw-fetch>` needs to be a child element of `<platinum-sw-register>`.
   *
   * An example configuration is:
   *
   *     <platinum-sw-register auto-register>
   *       <platinum-sw-import-script href="custom-fetch-handler.js"></platinum-sw-import-script>
   *       <platinum-sw-fetch handler="customFetchHandler"
   *                          path="/(.*)/customFetch"></platinum-sw-fetch>
   *     </platinum-sw-register>
   *
   * This implies that there's a `custom-fetch-handler.js` file in the same directory as the current
   * page, which defines a `sw-toolbox` compliant
   * [request handler](https://github.com/googlechrome/sw-toolbox#request-handlers) named
   * `customFetchHandler`. This definition is imported using `<platinum-sw-import-script>`. The
   * `<platinum-sw-fetch>` element takes care of mapping which request paths are handled by
   * `customFetchHandler`.
   *
   * Anything not matching the `path` pattern is ignored by `<platinum-sw-fetch>`,
   * and it's possible to have multiple `<platinum-sw-fetch>` elements that each define different
   * paths and different handlers. The path matching is performed top-down, starting with the first
   * `<platinum-sw-fetch>` element.
   *
   * The `path` will, by default, only match same-origin requests. If you'd like to define a custom
   * handler for requests on a specific cross-origin domain, you must use the `origin` parameter
   * in conjunction with `path` to match the domains you'd like to handle.
   */
  Polymer({
    is: 'platinum-sw-fetch',

    properties: {
      /**
       * The name of the request handler to use. This should be a `sw-toolbox`-style
       * [request handler](https://github.com/googlechrome/sw-toolbox#request-handlers).
       *
       * `handler` is a `String`, not a `function`, so you're providing the name of a function, not
       * the function itself. It can be a function defined in the
       * [`toolbox` scope](https://github.com/googlechrome/sw-toolbox#built-in-handlers)
       * (e.g. 'networkFirst', 'fastest', 'networkOnly', etc.) or a function defined in the
       * [`ServiceWorkerGlobalScope`](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#service-worker-global-scope),
       * like a function that is defined in a file that's imported via `platinum-sw-import-script`.
       **
       * @see {@link https://github.com/GoogleChrome/sw-toolbox#built-in-handlers}
       */
      handler: String,

      /**
       * By default, `path` will only match URLs under the current host (i.e. same-origin requests).
       * If you'd like to apply `handler` to cross-origin requests, then use `origin` to specify
       * which hosts will match. Setting `origin` is optional.
       *
       * `origin` is a `String`, but it is used internally to construct a
       * [`RegExp` object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions),
       * which is used for the matching.
       *
       * Note that the `origin` value will be matched against the full domain name and the protocol.
       * If you want to match  'http' and 'https', then use 'https?://' at the start of your string.
       *
       * Some examples:
       * - `origin="https?://.+\.google\.com"` → a RegExp that matches `http` or `https` requests
       *   made to any domain that ends in `.google.com`.
       * - `origin="https://www\.example\.com" → a RegExp that will only match `https` requests to
       *   one domain, `www.example.com`.
       *
       * @see {@link https://github.com/googlechrome/sw-toolbox#toolboxrouterheadurlpattern-handler-options}
       */
      origin: String,

      /**
       * URLs with paths matching `path` will have `handler` applied to them.
       *
       * By default, `path` will only match same-origin URLs. If you'd like it to match
       * cross-origin URLs, use `path` in conjunction with `origin`.
       *
       * As explained in the
       * [`sw-toolbox` docs](https://github.com/googlechrome/sw-toolbox#toolboxrouterheadurlpattern-handler-options),
       * the URL path matching is done using the [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp)
       * module, which is the same logic used in [Express-style routing](http://expressjs.com/guide/routing.html).
       *
       * In practice, you need to always use '/' as the first character of your `path`, and then
       * can use '(.*)' as a wildcard.
       *
       * Some examples:
       * - `path="/(.*)/customFetch"` → matches any path that ends with '/customFetch'.
       * - `path="/customFetch(.*)"` → matches any path that starts with '/customFetch', optionally
       *   followed by other characters.
       *
       * @see {@link https://github.com/pillarjs/path-to-regexp}
       */
      path: String
    },

    _getParameters: function(baseURI) {
      return new Promise(function(resolve) {
        var params = {
          importscriptLate: new URL('bootstrap/sw-toolbox-setup.js', baseURI).href
        };
        if (this.path && this.handler) {
          params.route = [this.path, this.handler, this.origin];
        } else {
          console.warn('The following platinum-sw-fetch element will not have any effect. ' +
            'Both the "path" and "handler" attributes must be set.', this);
        }
        resolve(params);
      }.bind(this));
    }
  });
/**
   * The `<platinum-sw-import-script>` element is used to import a JavaScript file that is executed
   * each time the service worker starts up.
   *
   * `<platinum-sw-import-script>` needs to be a child element of `<platinum-sw-register>`.
   *
   * A common use case is to define a custom request handler for a `fetch` event, but it can be used
   * for any type of code that you want to be executed by the service worker.
   *
   *     <platinum-sw-register auto-register>
   *       <platinum-sw-import-script href="custom-fetch-handler.js"></platinum-sw-import-script>
   *       <platinum-sw-fetch handler="customFetchHandler"
   *                          path="/(.*)/customFetch"></platinum-sw-fetch>
   *     </platinum-sw-register>
   *
   * You can specify multiple `<platinum-sw-import-script>` elements, each one corresponding to a
   * different JavaScript file. The JavaScript files will be loaded in the order in which the
   * `<platinum-sw-import-script>` elements appear. Under the hood, this results in an
   * [`importScripts()`](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)
   * call made from the context of the service worker.
   */
  Polymer({
    is: 'platinum-sw-import-script',

    properties: {
      /**
       * The URL of the JavaScript file that you want imported.
       *
       * Relative URLs are assumed to be
       * relative to the service worker's script location, which will almost always be the same
       * location as the page which includes this element.
       */
      href: String
    },

    _getParameters: function() {
      return new Promise(function(resolve) {
        var params = {};
        if (this.href) {
          params.importscript = this.href;
        } else {
          console.warn('The following platinum-sw-import-script element will not have any effect.' +
            ' The "href" attribute must be set.', this);
        }
        resolve(params);
      }.bind(this));
    }
  });
/**
   * The `<platinum-sw-offline-analytics>` element registers a service worker handler to
   * intercepts requests for Google Analytics pings.
   *
   * If the HTTP GET for the ping is successful (because the browser is online), then everything
   * proceeds as it normally would. If the HTTP GET fails, the ping request is saved to IndexedDB, and each time the service worker
   * script starts up it will attempt to "replay" those saved ping requests, giving up after one day
   * has passed.
   *
   * The [`qt`](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt)
   * URL parameter is automatically added to the replayed HTTP GET and set to the number of
   * milliseconds that has passed since the initial ping request was attempted, to ensure that the
   * original time attribution is correct.
   *
   * `<platinum-sw-offline-analytics>` does not take care of setting up Google Analytics on your
   * page, and assumes that you have [properly configured](https://support.google.com/analytics/answer/1008080)
   * Google Analytics tracking code registered elsewhere on your page.
   *
   * Since `<platinum-sw-offline-analytics>` is only useful if the page that is being tracked with
   * Google Analytics works offline, it's best used in conjunction with the `<platinum-sw-cache>`
   * element, which takes care of caching your site's resources and serving them while offline.
   *
   * A basic configuration is
   *
   *     <platinum-sw-register auto-register>
   *       <platinum-sw-offline-analytics></platinum-sw-offline-analytics>
   *       <platinum-sw-cache></platinum-sw-cache>
   *     </platinum-sw-register>
   *
   */
  Polymer({
    is: 'platinum-sw-offline-analytics',

    _getParameters: function(baseURI) {
      return Promise.resolve({
        importscript: new URL('bootstrap/simple-db.js', baseURI).href,
        importscriptLate: [
          new URL('bootstrap/sw-toolbox-setup.js', baseURI).href,
          new URL('bootstrap/offline-analytics.js', baseURI).href
        ]
      });
    }
  });
/**
   * The `<platinum-sw-register>` element handles
   * [service worker](http://www.html5rocks.com/en/tutorials/service-worker/introduction/)
   * registration, reflects the overall service worker state, and coordinates the configuration
   * provided by other Service Worker Elements.
   * `<platinum-sw-register>` is used as a parent element for child elements in the
   * `<platinum-sw-*>` group.
   *
   *     <platinum-sw-register skip-waiting
   *                           clients-claim
   *                           auto-register
   *                           state="{{state}}"
   *                           on-service-worker-error="handleSWError"
   *                           on-service-worker-updated="handleSWUpdated"
   *                           on-service-worker-installed="handleSWInstalled">
   *       ...one or more <platinum-sw-*> children which share the service worker registration...
   *     </platinum-sw-register>
   *
   * Please see https://github.com/PolymerElements/platinum-sw#top-level-sw-importjs for a
   * *crucial* prerequisite file you must create before `<platinum-sw-register>` can be used!
   *
   * @demo demo/index.html An offline-capable eReader demo.
   */
  Polymer({
    is: 'platinum-sw-register',

    // Used as an "emergency" switch if we make breaking changes in the way <platinum-sw-register>
    // talks to service-worker.js. Otherwise, it shouldn't need to change, and isn't meant to be
    // kept in sync with the element's release number.
    _version: '1.0',

    /**
     * Fired when the initial service worker installation completes successfully.
     * The service worker will normally only be installed once, the first time a page with a
     * `<platinum-sw-register>` element is visited in a given browser. If the same page is visited
     * again, the existing service worker will be reused, and there won't be another
     * `service-worker-installed` fired.
     *
     * @event service-worker-installed
     * @param {String} A message indicating that the installation succeeded.
     */

    /**
     * Fired when the service worker update flow completes successfully.
     * If you make changes to your `<platinum-sw-register>` configuration (i.e. by adding in new
     * `<platinum-sw-*>` child elements, or changing their attributes), users who had the old
     * service worker installed will get the update installed when they see the modified elements.
     *
     * @event service-worker-updated
     * @param {String} A message indicating that the update succeeded.
     */

    /**
     * Fired when an error prevents the service worker installation from completing.
     *
     * @event service-worker-error
     * @param {String} A message indicating what went wrong.
     */

    properties: {
      /**
       * Whether this element should automatically register the corresponding service worker as
       * soon as its added to a page.
       *
       * If set to `false`, then the service worker won't be automatically registered, and you
       * must call this element's `register()` method if you want service worker functionality.
       * This is useful if, for example, the service worker needs to be configured using
       * information that isn't immediately available at the time the page loads.
       *
       * If set to `true`, the service worker will be automatically registered without having to
       * call any methods.
       */
      autoRegister: {
        type: Boolean,
        value: false
      },

      /**
       * The URI used as a base when constructing relative paths to service worker helper libraries
       * that need to be loaded.
       *
       * This can normally be kept set to the default, which will use the directory containing this
       * element as the base. However, if you [Vulcanize](https://github.com/polymer/vulcanize) your
       * elements, then the default base might not be appropriate anymore. This will allow you to
       * override it.
       *
       * See https://github.com/PolymerElements/platinum-sw#relative-paths--vulcanization for more
       * information.
       */
      baseUri: {
        type: String,
        // Grab the URI of this file to use as a base when resolving relative paths.
        // Fallback to './' as a default, though current browsers that don't support
        // document.currentScript also don't support service workers.
        value: document.currentScript ? document.currentScript.baseURI : './'
      },

      /**
       * Whether the activated service worker should [take immediate control](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#clients-claim-method)
       * of any pages under its scope.
       *
       * If this is `false`, the service worker won't have any effect until the next time the page
       * is visited/reloaded.
       * If this is `true`, it will take control and start handling events for the current page
       * (and any pages under the same scope open in other tabs/windows) as soon it's active.
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#clients-claim-method}
       */
      clientsClaim: {
        type: Boolean,
        value: false
      },

      /**
       * The service worker script that is [registered](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register).
       * The script *should* be located at the top level of your site, to ensure that it is able
       * to control all the pages on your site.
       *
       * It's *strongly* recommended that you create a top-level file named `sw-import.js`
       * containing only:
       *
       * `importScripts('bower_components/platinum-sw/service-worker.js');`
       *
       * (adjust to match the path where your `platinum-sw` element directory can be found).
       *
       * This will ensure that your service worker script contains everything needed to play
       * nicely with the Service Worker Elements group.
       *
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register}
       */
      href: {
        type: String,
        value: 'sw-import.js'
      },

      /**
       * Whether the page should be automatically reloaded (via `window.location.reload()`) when
       * the service worker is successfully installed.
       *
       * While it's perfectly valid to continue using a page with a freshly installed service
       * worker, it's a common pattern to want to reload it immediately following the install.
       * This ensures that, for example, if you're using a `<platinum-sw-cache>` with an on the
       * fly caching strategy, it will get a chance to intercept all the requests needed to render
       * your page and store them in the cache.
       *
       * If you don't immediately reload your page, then any resources that were loaded before the
       * service worker was installed (e.g. this `platinum-sw-register.html` file) won't be present
       * in the cache until the next time the page is loaded.
       *
       * Note that this reload will only happen when a service worker is installed for the first
       * time. If the service worker is subsequently updated, it won't trigger another reload.
       */
      reloadOnInstall: {
        type: Boolean,
        value: false
      },

      /**
       * The scope of the service worker, relative to the registered service worker script.
       * All pages that fall under this scope will be controlled by the registered service worker.
       *
       * Normally, this would not need to be changed, unless you want the service worker to only
       * apply to a subset of your site.
       *
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register}
       */
      scope: {
        type: String,
        value: './'
      },

      /**
       * Whether an updated service worker should [bypass the `waiting` state](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#service-worker-global-scope-skipwaiting)
       * and immediately become `active`.
       *
       * Normally, during an update, the new service worker stays in the
       * `waiting` state until the current page and any other tabs/windows that are using the old
       * service worker are unloaded.
       *
       * If this is `false`, an updated service worker won't be activated until all instances of
       * the old server worker have been unloaded.
       *
       * If this is `true`, an updated service worker will become `active` immediately.
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#service-worker-global-scope-skipwaiting}
       */
      skipWaiting: {
        type: Boolean,
        value: false
      },

      /**
       * The current state of the service worker registered by this element.
       *
       * One of:
       * - 'installed'
       * - 'updated'
       * - 'error'
       * - 'unsupported'
       */
      state: {
        notify: true,
        readOnly: true,
        type: String
      }
    },

    /**
     * Registers the service worker based on the configuration options in this element and any
     * child elements.
     *
     * If you set the `autoRegister` property to `true`, then this method is called automatically
     * at page load.
     * It can be useful to set `autoRegister` to `false` and then explicitly call this method if
     * there are options that are only configured after the page is loaded.
     */
    register: function() {
      if ('serviceWorker' in navigator) {
        this._constructServiceWorkerUrl().then(function(serviceWorkerUrl) {
          this._registerServiceWorker(serviceWorkerUrl);
        }.bind(this));
      } else {
        this._setState('unsupported');
        this.fire('service-worker-error', 'Service workers are not available in the current browser.');
      }
    },

    _constructServiceWorkerUrl: function() {
      var paramsPromises = [];
      var children = Polymer.dom(this).children;
      var baseUri = new URL(this.baseUri, window.location.href);

      for (var i = 0; i < children.length; i++) {
        if (typeof children[i]._getParameters === 'function') {
          paramsPromises.push(children[i]._getParameters(baseUri));
        }
      }

      return Promise.all(paramsPromises).then(function(paramsResolutions) {
        var params = {
          baseURI: baseUri,
          version: this._version
        };

        paramsResolutions.forEach(function(childParams) {
          Object.keys(childParams).forEach(function(key) {
            if (Array.isArray(params[key])) {
              params[key] = params[key].concat(childParams[key]);
            } else {
              params[key] = [].concat(childParams[key]);
            }
          });
        });

        return params;
      }.bind(this)).then(function(params) {
        if (params.importscriptLate) {
          if (params.importscript) {
            params.importscript = params.importscript.concat(params.importscriptLate);
          } else {
            params.importscript = params.importscriptLate;
          }
        }

        if (params.importscript) {
          params.importscript = this._unique(params.importscript);
        }

        // We've already concatenated importscriptLate, so don't include it in the serialized URL.
        delete params.importscriptLate;

        params.clientsClaim = this.clientsClaim;
        params.skipWaiting = this.skipWaiting;

        var serviceWorkerUrl = new URL(this.href, window.location);
        // It's very important to ensure that the serialization is stable.
        // Serializing the same settings should always produce the same URL.
        // Serializing different settings should always produce a different URL.
        // This ensures that the service worker upgrade flow is triggered when settings change.
        serviceWorkerUrl.search = this._serializeUrlParams(params);

        return serviceWorkerUrl;
      }.bind(this));
    },

    _unique: function(arr) {
      return arr.filter(function(item, index) {
        return arr.indexOf(item) === index;
      });
    },

    _serializeUrlParams: function(params) {
      return Object.keys(params).sort().map(function(key) {
        // encodeURIComponent(['a', 'b']) => 'a%2Cb',
        // so this will still work when the values are Arrays.
        // TODO: It won't work if the values in the Arrays have ',' characters in them.
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      }).join('&');
    },

    _registerServiceWorker: function(serviceWorkerUrl) {
      navigator.serviceWorker.register(serviceWorkerUrl, {scope: this.scope}).then(function(registration) {
        if (registration.active) {
          this._setState('installed');
        }

        registration.onupdatefound = function() {
          var installingWorker = registration.installing;
          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  this._setState('updated');
                  this.fire('service-worker-updated',
                    'A new service worker was installed, replacing the old service worker.');
                } else {
                  if (this.reloadOnInstall) {
                    window.location.reload();
                  } else {
                    this._setState('installed');
                    this.fire('service-worker-installed', 'A new service worker was installed.');
                  }
                }
              break;

              case 'redundant':
                this._setState('error');
                this.fire('service-worker-error', 'The installing service worker became redundant.');
              break;
            }
          }.bind(this);
        }.bind(this);
      }.bind(this)).catch(function(error) {
        this._setState('error');
        this.fire('service-worker-error', error.toString());
        if (error.name === 'NetworkError') {
          var location = serviceWorkerUrl.origin + serviceWorkerUrl.pathname;
          console.error('A valid service worker script was not found at ' + location + '\n' +
            'To learn how to fix this, please see\n' +
            'https://github.com/PolymerElements/platinum-sw#top-level-sw-importjs');
        }
      }.bind(this));
    },

    attached: function() {
      if (this.autoRegister) {
        this.async(this.register);
      }
    }
  });
/**
Dynamically loads the Google Maps JavaScript API, firing the `api-load` event when ready.

#### Example

    <google-maps-api api-key="abc123" version="3.exp"></google-maps-api>
    <script>
      var mapsAPI = document.querySelector('google-maps-api');
      mapsAPI.addEventListener('api-load', function(e) {
        // this.api === google.maps
      });
    <script>

Any number of components can use `<google-maps-api>` elements, and the library will only be loaded once.

@summary Element wrapper around Google Maps API.

 */
  Polymer({

    is: 'google-maps-api',

    behaviors: [
      Polymer.IronJsonpLibraryBehavior
    ],

    properties: {

      /** @private */
      mapsUrl: {
        type: String,
        value: 'https://maps.googleapis.com/maps/api/js?callback=%%callback%%'
      },

      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: {
        type: String,
        value: ''
      },

      /**
       * A Maps API for Business Client ID. To obtain a Maps API for Business Client ID, see developers.google.com/maps/documentation/business/.
       * If set, a Client ID will take precedence over an API Key.
       */
      clientId: {
        type: String,
        value: ''
      },

      /**
       * Version of the Maps API to use.
       */
      version: {
        type: String,
        value: '3.exp'
      },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String,
        value: ''
      },
      /**
       * If true, sign-in is enabled.
       * See https://developers.google.com/maps/documentation/javascript/signedin#enable_sign_in
       */
      signedIn: {
        type: Boolean,
        value: false
      },

      /**
       * Fired when the Maps API library is loaded and ready.
       * @event api-load
       */
      /**
       * Name of event fired when library is loaded and available.
       */
      notifyEvent: {
        type: String,
        value: 'api-load'
      },

      /** @private */
      libraryUrl: {
        type: String,
        computed: '_computeUrl(mapsUrl, version, apiKey, clientId, language, signedIn)'
      }
    },

    _computeUrl: function(mapsUrl, version, apiKey, clientId, language, signedIn) {
      var url = mapsUrl + '&v=' + version;

      // Always load all Maps API libraries.
      url += '&libraries=drawing,geometry,places,visualization';

      if (apiKey && !clientId) {
        url += '&key=' + apiKey;
      }

      if (clientId) {
        url += '&client=' + clientId;
      }

      if (language) {
        url += '&language=' + language;
      }

      if (signedIn) {
        url += '&signed_in=' + signedIn;
      }
      return url;
    },

    /**
     * Provides the google.maps JS API namespace.
     */
    get api() {
      return google.maps;
    }
  });
Polymer({

    is: 'google-map-search',

    properties: {

      /**
       * The Google map object.
       */
      map: {
        type: Object,
        value: null
      },

      /**
       * The search query.
       */
      query: {
        type: String,
        value: null
      },

      /**
       * Latitude of the center of the search area.
       * Ignored if `globalSearch` is true.
       */
      latitude: {
        type: Number,
        value: null
      },

      /**
       * Longitude of the center of the search area.
       * Ignored if `globalSearch` is true.
       */
      longitude: {
        type: Number,
        value: null
      },

      /**
       * Search radius, in meters.
       * If `latitude` and `longitude` are not specified,
       * the center of the currently visible map area is used.
       *
       * If not set, search will be restricted to the currently visible
       * map area, unless `globalSearch` is set to true.
       */
      radius: {
        type: Number,
        value: null
      },

      /**
       * By default, search is restricted to the currently visible map area.
       * Set this to true to search everywhere.
       *
       * Ignored if `radius` is set.
       */
      globalSearch: {
        type: Boolean,
        value: false
      },

      /**
       * Space-separated list of result types.
       * The search will only return results of the listed types.
       * See https://developers.google.com/places/documentation/supported_types
       * for a list of supported types.
       * Leave empty or null to search for all result types.
       */
      types: {
        type: String,
        value: null
      },

      /**
       * The search results.
       */
      results: {
        type: Array,
        value: function() { return []; },
        notify: true
      },

      /**
       * The lat/lng location.
       */
      location: {
        type: Object,
        value: null,
        readOnly: true
      }
    },

    observers: [
      'search(query,map,location,radius,types,globalSearch)',
      '_updateLocation(latitude,longitude)'
    ],

    /**
     * Fired when the details of a place are returned.
     *
     * @event google-map-search-place-detail
     * @param {google.maps.MarkerPlace} detail The place details.
     */

    /**
     * Fired when the search element returns a result.
     *
     * @event google-map-search-results
     * @param {Array<{latitude: number, longitude: number}>} detail An array of search results
     */

    /**
     * Perform a search using for `query` for the search term.
     */
    search: function() {
      if (this.query && this.map) {
        var places = new google.maps.places.PlacesService(this.map);

        if (this.types && typeof this.types == 'string') {
          var types = this.types.split(' ');
        }

        if (!this.globalSearch) {
          var bounds = this.map.getBounds();
        } else if (this.radius) {
          var radius = this.radius;
          var location = this.location ? this.location : this.map.getCenter();
        }

        places.textSearch({
          query: this.query,
          types: types,
          bounds: bounds,
          radius: radius,
          location: location
        }, this._gotResults.bind(this));
      }
    },

    /**
     * Fetches details for a given place.
     * @param {String} placeId The place id.
     * @return {Promise} place The place information.
     */
    getDetails: function(placeId) {
      var places = new google.maps.places.PlacesService(this.map);

      return new Promise(function(resolve, reject) {
        places.getDetails({placeId: placeId}, function(place, status) {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(place);
            this.fire('google-map-search-place-detail', place);
          } else {
            reject(status);
          }
        }.bind(this));
      }.bind(this));
    },

    _gotResults: function(results, status) {
      this.results = results.map(function(result) {
        // obtain lat/long from geometry
        result.latitude  = result.geometry.location.lat();
        result.longitude = result.geometry.location.lng();
        return result;
      });
      this.fire('google-map-search-results', this.results);
    },

    _updateLocation: function() {
      if (!this.map) {
        return;
      } else if (typeof this.latitude !== 'number' || isNaN(this.latitude)) {
        throw new TypeError('latitude must be a number');
      } else if (typeof this.longitude !== 'number' || isNaN(this.longitude)) {
        throw new TypeError('longitude must be a number');
      }

      // Update location. This will trigger a new search.
      this._setLocation({lat: this.latitude, lng: this.longitude});
    }
  });
Polymer({
    is: 'paper-input-container',

    properties: {
      /**
       * Set to true to disable the floating label. The label disappears when the input value is
       * not null.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the floating label.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * The attribute to listen for value changes on.
       */
      attrForValue: {
        type: String,
        value: 'bind-value'
      },

      /**
       * Set to true to auto-validate the input value when it changes.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * True if the input is invalid. This property is set automatically when the input value
       * changes if auto-validating, or when the `iron-input-validate` event is heard from a child.
       */
      invalid: {
        observer: '_invalidChanged',
        type: Boolean,
        value: false
      },

      /**
       * True if the input has focus.
       */
      focused: {
        readOnly: true,
        type: Boolean,
        value: false,
        notify: true
      },

      _addons: {
        type: Array
        // do not set a default value here intentionally - it will be initialized lazily when a
        // distributed child is attached, which may occur before configuration for this element
        // in polyfill.
      },

      _inputHasContent: {
        type: Boolean,
        value: false
      },

      _inputSelector: {
        type: String,
        value: 'input,textarea,.paper-input-input'
      },

      _boundOnFocus: {
        type: Function,
        value: function() {
          return this._onFocus.bind(this);
        }
      },

      _boundOnBlur: {
        type: Function,
        value: function() {
          return this._onBlur.bind(this);
        }
      },

      _boundOnInput: {
        type: Function,
        value: function() {
          return this._onInput.bind(this);
        }
      },

      _boundValueChanged: {
        type: Function,
        value: function() {
          return this._onValueChanged.bind(this);
        }
      }
    },

    listeners: {
      'addon-attached': '_onAddonAttached',
      'iron-input-validate': '_onIronInputValidate'
    },

    get _valueChangedEvent() {
      return this.attrForValue + '-changed';
    },

    get _propertyForValue() {
      return Polymer.CaseMap.dashToCamelCase(this.attrForValue);
    },

    get _inputElement() {
      return Polymer.dom(this).querySelector(this._inputSelector);
    },

    get _inputElementValue() {
      return this._inputElement[this._propertyForValue] || this._inputElement.value;
    },

    ready: function() {
      if (!this._addons) {
        this._addons = [];
      }
      this.addEventListener('focus', this._boundOnFocus, true);
      this.addEventListener('blur', this._boundOnBlur, true);
      if (this.attrForValue) {
        this._inputElement.addEventListener(this._valueChangedEvent, this._boundValueChanged);
      } else {
        this.addEventListener('input', this._onInput);
      }
    },

    attached: function() {
      // Only validate when attached if the input already has a value.
      if (this._inputElementValue != '') {
        this._handleValueAndAutoValidate(this._inputElement);
      } else {
        this._handleValue(this._inputElement);
      }

      this._numberOfPrefixNodes = 0;
      this._prefixObserver = Polymer.dom(this.$.prefix).observeNodes(
          function(mutations) {
            // Keep track whether there's at least one prefix node, since it
            // affects laying out the floating label.
            this._numberOfPrefixNodes += mutations.addedNodes.length -
                mutations.removedNodes.length;
          }.bind(this));
    },

    detached: function() {
      if (this._prefixObserver) {
        Polymer.dom(this.$.prefix).unobserveNodes(this._prefixObserver);
      }
    },

    _onAddonAttached: function(event) {
      if (!this._addons) {
        this._addons = [];
      }
      var target = event.target;
      if (this._addons.indexOf(target) === -1) {
        this._addons.push(target);
        if (this.isAttached) {
          this._handleValue(this._inputElement);
        }
      }
    },

    _onFocus: function() {
      this._setFocused(true);
    },

    _onBlur: function() {
      this._setFocused(false);
      this._handleValueAndAutoValidate(this._inputElement);
    },

    _onInput: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _onValueChanged: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _handleValue: function(inputElement) {
      var value = this._inputElementValue;

      // type="number" hack needed because this.value is empty until it's valid
      if (value || value === 0 || (inputElement.type === 'number' && !inputElement.checkValidity())) {
        this._inputHasContent = true;
      } else {
        this._inputHasContent = false;
      }

      this.updateAddons({
        inputElement: inputElement,
        value: value,
        invalid: this.invalid
      });
    },

    _handleValueAndAutoValidate: function(inputElement) {
      if (this.autoValidate) {
        var valid;
        if (inputElement.validate) {
          valid = inputElement.validate(this._inputElementValue);
        } else {
          valid = inputElement.checkValidity();
        }
        this.invalid = !valid;
      }

      // Call this last to notify the add-ons.
      this._handleValue(inputElement);
    },

    _onIronInputValidate: function(event) {
      this.invalid = this._inputElement.invalid;
    },

    _invalidChanged: function() {
      if (this._addons) {
        this.updateAddons({invalid: this.invalid});
      }
    },

    /**
     * Call this to update the state of add-ons.
     * @param {Object} state Add-on state.
     */
    updateAddons: function(state) {
      for (var addon, index = 0; addon = this._addons[index]; index++) {
        addon.update(state);
      }
    },

    _computeInputContentClass: function(noLabelFloat, alwaysFloatLabel, focused, invalid, _inputHasContent) {
      var cls = 'input-content';
      if (!noLabelFloat) {
        var label = this.querySelector('label');

        if (alwaysFloatLabel || _inputHasContent) {
          cls += ' label-is-floating';
          if (invalid) {
            cls += ' is-invalid';
          } else if (focused) {
            cls += " label-is-highlighted";
          }
          // If a prefix element exists, the label has a horizontal offset
          // which needs to be undone when displayed as a floating label.
          if (this._numberOfPrefixNodes > 0) {
            this.$.labelAndInputContainer.style.position = 'static';
          }
        } else {
          // When the label is not floating, it should overlap the input element.
          if (label) {
            this.$.labelAndInputContainer.style.position = 'relative';
          }
        }
      } else {
        if (_inputHasContent) {
          cls += ' label-is-hidden';
        }
      }
      return cls;
    },

    _computeUnderlineClass: function(focused, invalid) {
      var cls = 'underline';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    },

    _computeAddOnContentClass: function(focused, invalid) {
      var cls = 'add-on-content';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    }
  });
Polymer({
    is: 'paper-input-error',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      /**
       * True if the error is showing.
       */
      invalid: {
        readOnly: true,
        reflectToAttribute: true,
        type: Boolean
      }
    },

    update: function(state) {
      this._setInvalid(state.invalid);
    }
  });
Polymer({

      is: 'iron-icon',

      properties: {

        /**
         * The name of the icon to use. The name should be of the form:
         * `iconset_name:icon_name`.
         */
        icon: {
          type: String,
          observer: '_iconChanged'
        },

        /**
         * The name of the theme to used, if one is specified by the
         * iconset.
         */
        theme: {
          type: String,
          observer: '_updateIcon'
        },

        /**
         * If using iron-icon without an iconset, you can set the src to be
         * the URL of an individual icon image file. Note that this will take
         * precedence over a given icon attribute.
         */
        src: {
          type: String,
          observer: '_srcChanged'
        },

        /**
         * @type {!Polymer.IronMeta}
         */
        _meta: {
          value: Polymer.Base.create('iron-meta', {type: 'iconset'})
        }

      },

      _DEFAULT_ICONSET: 'icons',

      _iconChanged: function(icon) {
        var parts = (icon || '').split(':');
        this._iconName = parts.pop();
        this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
        this._updateIcon();
      },

      _srcChanged: function(src) {
        this._updateIcon();
      },

      _usesIconset: function() {
        return this.icon || !this.src;
      },

      /** @suppress {visibility} */
      _updateIcon: function() {
        if (this._usesIconset()) {
          if (this._iconsetName) {
            this._iconset = /** @type {?Polymer.Iconset} */ (
              this._meta.byKey(this._iconsetName));
            if (this._iconset) {
              this._iconset.applyIcon(this, this._iconName, this.theme);
              this.unlisten(window, 'iron-iconset-added', '_updateIcon');
            } else {
              this.listen(window, 'iron-iconset-added', '_updateIcon');
            }
          }
        } else {
          if (!this._img) {
            this._img = document.createElement('img');
            this._img.style.width = '100%';
            this._img.style.height = '100%';
            this._img.draggable = false;
          }
          this._img.src = this.src;
          Polymer.dom(this.root).appendChild(this._img);
        }
      }

    });
(function() {
  Polymer({

    is: 'gold-cc-cvc-input',

    properties: {

      /**
       * The label for this input.
       */
      label: {
        type: String,
        value: 'CVC'
      },

      /**
       * The type of card that the CVC is for.
       */
      cardType: {
        type: String,
        value: ''
      },

      _requiredLength: {
        type: Number,
        computed: '_computeRequiredLength(cardType)'
      },

      _amex: {
        type: Boolean,
        computed: '_computeIsAmex(cardType)'
      },

      value: {
        observer: '_onValueChanged'
      }
    },

    behaviors: [
      Polymer.PaperInputBehavior,
      Polymer.IronFormElementBehavior
    ],

    observers: [
      '_onFocusedChanged(focused)'
    ],

    ready: function() {
      // If there's an initial input, validate it.
      if (this.value)
        this._handleAutoValidate();
    },

    /**
     * A handler that is called on input
     */
    _onValueChanged: function(value, oldValue) {
      // The initial property assignment is handled by `ready`.
      if (oldValue == undefined)
        return;
      this._handleAutoValidate();
    },

    _computeRequiredLength: function(cardType) {
      return this._computeIsAmex(cardType) ? 4 : 3;
    },

    _computeIsAmex: function(cardType) {
      return cardType.toLowerCase() == 'amex';
    },

    /**
     * Returns true if the element has a valid value, and sets the visual
     * error state.
     *
     * @return {boolean} Whether the input is currently valid or not.
     */
    validate: function() {
      // Empty, non-required input is valid.
      if (!this.required && this.value == '') {
        return true;
      }

      var valid = this.value.length == this._requiredLength;

      // Update the container and its addons (i.e. the custom error-message).
      this.$.container.invalid = !valid;
      this.$.container.updateAddons({
        inputElement: this.$.input,
        value: this.value,
        invalid: !valid
      });

      return valid;
    },

    /**
     * Overidden from Polymer.IronControlState.
     */
    _onFocusedChanged: function(focused) {
      if (!focused) {
        this._handleAutoValidate();
      }
    }
  })

})();
Polymer({

    is: 'date-input',

    behaviors: [
      Polymer.IronValidatableBehavior
    ],

    properties: {
      /**
       * Set to true to mark the input as required.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The month component of the date displayed.
       */
      month: {
        type: String
      },

      /**
       * The year component of the date displayed.
       */
      year: {
        type: String
      },

      /**
       * The date object used by the validator. Has two properties, month and year.
       */
      date: {
        notify: true,
        type: Object
      },

      validator: {
        type: String,
        value: 'date-validator'
      },

      ariaLabelPrefix: {
        type:String
      }

    },

    observers: [
      '_computeDate(month,year)'
    ],

    _computeDate: function(month, year) {
      // Months are 0-11.
      this.date = {month: month, year: year};
      this.fire('dateChanged', this.date);
      // Advance cursor to year after month entry
      if (month.length === 2) {
        this.$.expirationYear.focus();
      }
    },

    validate: function() {
      // Empty, non-required input is valid.
      if (!this.required && this.month == '' && this.year == '') {
        return true;
      }
      this.invalid = !this.$.validator.validate(this.date);
      this.fire('iron-input-validate');
      return !this.invalid;
    },

    _computeAriaLabel: function(dateLabel, monthLabel) {
      return dateLabel + ' ' + monthLabel;
    }

  });
(function() {

  Polymer({

    is: 'gold-cc-expiration-input',

    behaviors: [
      Polymer.PaperInputBehavior,
      Polymer.IronFormElementBehavior
    ],

    properties: {
      /**
       * The label for this input.
       */
      label: {
        type: String,
        value: "Expiration Date"
      },

      value: {
        value: '',
        observer: '_onValueChanged'
      }
    },

    listeners: {
      'dateChanged': '_dateChanged'
    },

    observers: [
      '_onFocusedChanged(focused)'
    ],

    ready: function() {
      // If there's an initial input, validate it.
      if (this.value)
        this._handleAutoValidate();
    },

    /**
     * A handler that is called on input
     */
    _onValueChanged: function(value, oldValue) {
      // The initial property assignment is handled by `ready`.
      if (oldValue == undefined)
        return;

      this._handleAutoValidate();
    },

    _dateChanged: function(event) {
      if (event.detail.month && event.detail.year) {
        this.value = event.detail.month + '/' + event.detail.year;
      }
    },

    _computeMonth: function(value) {
      // Date is in MM/YY format.
      return value.split('/')[0];
    },

    _computeYear: function(value) {
      // Date is in MM/YY format.
      return value.split('/')[1];
    },

    /**
     * Overidden from Polymer.PaperInputBehavior.
     */
    validate: function() {
      return this.$.input.validate();
    },

    /**
     * Overidden from Polymer.IronControlState.
     */
    _onFocusedChanged: function(focused) {
      if (!focused) {
        this._handleAutoValidate();
      }
    }
      
  })

})();
(function() {
  Polymer({

    is: 'gold-cc-input',

    behaviors: [
      Polymer.PaperInputBehavior,
      Polymer.IronValidatableBehavior,
      Polymer.IronFormElementBehavior
    ],

    properties: {
      /**
       * The label for this input.
       */
      label: {
        type: String,
        value: "Card number"
      },

      /**
       * The type of the credit card, if it is valid. Empty otherwise.
       */
      cardType: {
        type: String,
        notify: true
      },

      value: {
        observer: '_onValueChanged'
      }
    },

    observers: [
      '_onFocusedChanged(focused)'
    ],

    ready: function() {
      // If there's an initial input, validate it.
      if (this.value)
        this._handleAutoValidate();
    },

    /**
     * A handler that is called on input
     */
    _onValueChanged: function(value, oldValue) {
      // The initial property assignment is handled by `ready`.
      if (oldValue == undefined)
        return;

      var start = this.$.input.selectionStart;
      var previousCharASpace = value ? this.value.charAt(start - 1) == ' ' : false;

      var value = value.replace(/\s+/g, '');
      var formattedValue = '';
      for (var i = 0; i < value.length; i++) {
        // Add a space after every 4 characters.
        if ((i != 0) && (i % 4 == 0)) {
          formattedValue += ' ';
        }
        formattedValue += value[i];
      }
      this.updateValueAndPreserveCaret(formattedValue.trim());

      // If the character right before the selection is a newly inserted
      // space, we need to advance the selection to maintain the caret position.
      if (!previousCharASpace && this.value.charAt(start - 1) == ' ') {
        this.$.input.selectionStart = start+1;
        this.$.input.selectionEnd = start+1;
      }

      this._handleAutoValidate();
    },

    /**
     * Returns true if the element has a valid value, and sets the visual
     * error state.
     *
     * @return {boolean} Whether the input is currently valid or not.
     */
    validate: function() {
      // Empty, non-required input is valid.
      if (!this.required && this.value == '') {
        return true;
      }

      var result = CreditCardValidator.validate(this.value);
      var valid = result.valid && result.length_valid;
      this.cardType = valid ? result.card_type.name : '';

      // Update the container and its addons (i.e. the custom error-message).
      this.$.container.invalid = !valid;
      this.$.container.updateAddons({
        inputElement: this.$.input,
        value: this.value,
        invalid: !valid
      });

      // We don't have icons for all the card types.
      if (valid && result.card_type.icon) {
        this.$.icon.src = this.resolveUrl(result.card_type.icon);
        this.$.icon.alt = this.cardType;
        this.$.icon.hidden = false;
      } else {
        this.$.icon.src = null;
        this.$.icon.alt = '';
        this.$.icon.hidden = true;
      }

      return valid;
    },

    /**
     * Overidden from Polymer.IronControlState.
     */
    _onFocusedChanged: function(focused) {
      if (!focused) {
        this._handleAutoValidate();
      }
    }
  })

})();
(function() {
  Polymer({

    is: 'gold-email-input',

    behaviors: [
      Polymer.PaperInputBehavior,
      Polymer.IronFormElementBehavior
    ],

    properties: {
      /**
       * The label for this input.
       */
      label: {
        type: String,
        value: "Email"
      },

      /**
       * The regular expression used to validate the email. By default, the
       * input is of type=email and uses the native input regex, as defined in
       * the spec: http://www.w3.org/TR/html-markup/input.email.html#input.email.attrs.value.single.
       * You can override this if you want your email to be validated against
       * a custom regex. If the empty string, then no validation will be applied.
       */
      regex: {
        type: String,
        value: null
      },

      value: {
        observer: '_onValueChanged'
      }
    },

    observers: [
      '_onFocusedChanged(focused)'
    ],

    ready: function() {
      // If there's an initial input, validate it.
      if (this.value)
        this._handleAutoValidate();
    },

    /**
     * A handler that is called on input
     */
    _onValueChanged: function(value, oldValue) {
      // The initial property assignment is handled by `ready`.
      if (oldValue == undefined)
        return;

      this._handleAutoValidate();
    },

    /**
     * Returns true if the element has a valid value, and sets the visual error
     * state.
     *
     * @return {boolean} Whether the input is currently valid or not.
     */
    validate: function() {

      var valid;

      // Empty, non-required input is valid.
      if (!this.required && this.value == '') {
        valid = true;
      } else if (this.regex === null) {
        // If the regex isn't set, then use the native validator.
        valid = this.$.input.validate();
      } else {
        // A blank regex means everything is valid. Else, check value against regex.
        valid = new RegExp(this.regex, "i").test(this.value);
      }

      // Check if validity has changed
      if (valid == this.invalid) {
        // Update `this.invalid` since it's data-bound to container
        this.invalid = !valid;

        // Update container's addons (i.e. the custom error-message).
        this.$.container.updateAddons({
          inputElement: this.$.input,
          value: this.value,
          invalid: !valid
        });
      }

      return valid;
    },

    /**
     * Overidden from Polymer.IronControlState.
     */
    _onFocusedChanged: function(focused) {
      if (!focused) {
        this._handleAutoValidate();
      }
    }
  })

})();
(function() {
  Polymer({

    is: 'gold-phone-input',

    behaviors: [
      Polymer.PaperInputBehavior,
      Polymer.IronFormElementBehavior
    ],

    properties: {
      /**
       * The label for this input.
       */
      label: {
        type: String,
        value: 'Phone number'
      },

      /*
       * The country code that should be recognized and parsed.
       */
      countryCode: {
        type: String,
        value: '1'
      },

      /*
       * The format of a valid phone number, including formatting but excluding
       * the country code. Use 'X' to denote the digits separated by dashes.
       */
      phoneNumberPattern: {
        type: String,
        value: 'XXX-XXX-XXXX',
        observer: '_phoneNumberPatternChanged'
      },

      value: {
        observer: '_onValueChanged'
      }
    },

    observers: [
      '_onFocusedChanged(focused)'
    ],

    ready: function() {
      // If there's an initial input, validate it.
      if (this.value)
        this._handleAutoValidate();
    },

    _phoneNumberPatternChanged: function() {
      // Transform the pattern into a regex the iron-input understands.
      var regex = '';
      regex = this.phoneNumberPattern.replace(/\s/g, '\\s');
      regex = regex.replace(/X/gi, '\\d');
      regex = regex.replace(/\+/g, '\\+');
      this.$.input.pattern = regex;
    },

    /**
     * A handler that is called on input
     */
    _onValueChanged: function(value, oldValue) {
       // The initial property assignment is handled by `ready`.
       if (oldValue == undefined)
         return;

      var start = this.$.input.selectionStart;
      var previousCharADash = value ? this.value.charAt(start - 1) == '-' : false;

      // Remove any already-applied formatting.
      value = value.replace(/-/g, '');
      var shouldFormat = value.length <= this.phoneNumberPattern.replace(/-/g, '').length;
      var formattedValue = '';

      // Fill in the dashes according to the specified pattern.
      var currentDashIndex = 0;
      var totalDashesAdded = 0;
      for (var i = 0; i < value.length; i++) {
        currentDashIndex = this.phoneNumberPattern.indexOf('-', currentDashIndex);

        // Since we remove any formatting first, we need to account added dashes
        // when counting the position of new dashes in the pattern.
        if (shouldFormat && i == (currentDashIndex - totalDashesAdded)) {
          formattedValue += '-';
          currentDashIndex++;
          totalDashesAdded++;
        }

        formattedValue += value[i];
      }
      this.updateValueAndPreserveCaret(formattedValue.trim());

      // If the character right before the selection is a newly inserted
      // dash, we need to advance the selection to maintain the caret position.
      if (!previousCharADash && this.value.charAt(start - 1) == '-') {
        this.$.input.selectionStart = start + 1;
        this.$.input.selectionEnd = start + 1;
      }

      this._handleAutoValidate();
    },

    /**
     * Overidden from Polymer.PaperInputBehavior.
     */
    validate: function() {
      // Update the container and its addons (i.e. the custom error-message).
      var valid = this.$.input.validate()
      this.$.container.invalid = !valid;
      this.$.container.updateAddons({
        inputElement: this.$.input,
        value: this.value,
        invalid: !valid
      });

      return valid;
    },

    /**
     * Overidden from Polymer.IronControlState.
     */
    _onFocusedChanged: function(focused) {
      if (!focused) {
        this._handleAutoValidate();
      }
    }
  })

})();
(function() {
  Polymer({

    is: 'gold-zip-input',

    behaviors: [
      Polymer.PaperInputBehavior,
      Polymer.IronFormElementBehavior
    ],

    properties: {
      /**
       * The label for this input.
       */
      label: {
        type: String,
        value: "Zip Code"
      }
    },

    observers: [
      '_computeValue(value)'
    ],

    _computeValue: function(value) {
      var start = this.$.input.selectionStart;
      var previousCharADash = this.value ? this.value.charAt(start - 1) == '-' : false;

      // Remove any already-applied formatting.
      value = value.replace(/-/g, '');

      // Add a dash after the 5th character
      if (value.length > 5) {
        value = value.substr(0,5) + '-' + value.substr(5)
      }
      this.updateValueAndPreserveCaret(value.trim());

      // If the character right before the selection is a newly inserted
      // dash, we need to advance the selection to maintain the caret position.
      if (!previousCharADash && this.value.charAt(start - 1) == '-') {
        this.$.input.selectionStart = start + 1;
        this.$.input.selectionEnd = start + 1;
      }
    }

  })

})();
(function() {
      'use strict';

      Polymer.IronA11yAnnouncer = Polymer({
        is: 'iron-a11y-announcer',

        properties: {

          /**
           * The value of mode is used to set the `aria-live` attribute
           * for the element that will be announced. Valid values are: `off`,
           * `polite` and `assertive`.
           */
          mode: {
            type: String,
            value: 'polite'
          },

          _text: {
            type: String,
            value: ''
          }
        },

        created: function() {
          if (!Polymer.IronA11yAnnouncer.instance) {
            Polymer.IronA11yAnnouncer.instance = this;
          }

          document.body.addEventListener('iron-announce', this._onIronAnnounce.bind(this));
        },

        /**
         * Cause a text string to be announced by screen readers.
         *
         * @param {string} text The text that should be announced.
         */
        announce: function(text) {
          this._text = '';
          this.async(function() {
            this._text = text;
          }, 100);
        },

        _onIronAnnounce: function(event) {
          if (event.detail && event.detail.text) {
            this.announce(event.detail.text);
          }
        }
      });

      Polymer.IronA11yAnnouncer.instance = null;

      Polymer.IronA11yAnnouncer.requestAvailability = function() {
        if (!Polymer.IronA11yAnnouncer.instance) {
          Polymer.IronA11yAnnouncer.instance = document.createElement('iron-a11y-announcer');
        }

        document.body.appendChild(Polymer.IronA11yAnnouncer.instance);
      };
    })();
Polymer({

    is: 'iron-autogrow-textarea',

    behaviors: [
      Polymer.IronFormElementBehavior,
      Polymer.IronValidatableBehavior,
      Polymer.IronControlState
    ],

    properties: {

      /**
       * Use this property instead of `value` for two-way data binding.
       *
       * @type {string|number|undefined|null}
       */
      bindValue: {
        observer: '_bindValueChanged',
        type: String
      },

      /**
       * The initial number of rows.
       *
       * @attribute rows
       * @type number
       * @default 1
       */
      rows: {
        type: Number,
        value: 1,
        observer: '_updateCached'
      },

      /**
       * The maximum number of rows this element can grow to until it
       * scrolls. 0 means no maximum.
       *
       * @attribute maxRows
       * @type number
       * @default 0
       */
      maxRows: {
       type: Number,
       value: 0,
       observer: '_updateCached'
      },

      /**
       * Bound to the textarea's `autocomplete` attribute.
       */
      autocomplete: {
        type: String,
        value: 'off'
      },

      /**
       * Bound to the textarea's `autofocus` attribute.
       */
      autofocus: {
        type: Boolean,
        value: false
      },

      /**
       * Bound to the textarea's `inputmode` attribute.
       */
      inputmode: {
        type: String
      },

      /**
       * Bound to the textarea's `name` attribute.
       */
      name: {
        type: String
      },

      /**
       * The value for this input, same as `bindValue`
       */
      value: {
        notify: true,
        type: String,
        computed: '_computeValue(bindValue)'
      },

      /**
       * Bound to the textarea's `placeholder` attribute.
       */
      placeholder: {
        type: String
      },

      /**
       * Bound to the textarea's `readonly` attribute.
       */
      readonly: {
        type: String
      },

      /**
       * Set to true to mark the textarea as required.
       */
      required: {
        type: Boolean
      },

      /**
       * The maximum length of the input value.
       */
      maxlength: {
        type: Number
      }

    },

    listeners: {
      'input': '_onInput'
    },

    /**
     * Returns the underlying textarea.
     * @type HTMLTextAreaElement
     */
    get textarea() {
      return this.$.textarea;
    },

    /**
     * Returns textarea's selection start.
     * @type Number
     */
    get selectionStart() {
      return this.$.textarea.selectionStart;
    },

    /**
     * Returns textarea's selection end.
     * @type Number
     */
    get selectionEnd() {
      return this.$.textarea.selectionEnd;
    },

    /**
     * Sets the textarea's selection start.
     */
    set selectionStart(value) {
      this.$.textarea.selectionStart = value;
    },

    /**
     * Sets the textarea's selection end.
     */
    set selectionEnd(value) {
      this.$.textarea.selectionEnd = value;
    },

    /**
     * Returns true if `value` is valid. The validator provided in `validator`
     * will be used first, if it exists; otherwise, the `textarea`'s validity
     * is used.
     * @return {boolean} True if the value is valid.
     */
    validate: function() {
      // Empty, non-required input is valid.
      if (!this.required && this.value == '') {
        this.invalid = false;
        return true;
      }

      var valid;
      if (this.hasValidator()) {
        valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
      } else {
        valid = this.$.textarea.validity.valid;
        this.invalid = !valid;
      }
      this.fire('iron-input-validate');
      return valid;
    },

    _bindValueChanged: function() {
      var textarea = this.textarea;
      if (!textarea) {
        return;
      }

      // If the bindValue changed manually, then we need to also update
      // the underlying textarea's value. Otherwise this change was probably
      // generated from the _onInput handler, and the two values are already
      // the same.
      if (textarea.value !== this.bindValue) {
        textarea.value = !(this.bindValue || this.bindValue === 0) ? '' : this.bindValue;
      }

      this.$.mirror.innerHTML = this._valueForMirror();
      // manually notify because we don't want to notify until after setting value
      this.fire('bind-value-changed', {value: this.bindValue});
    },

    _onInput: function(event) {
      this.bindValue = event.path ? event.path[0].value : event.target.value;
    },

    _constrain: function(tokens) {
      var _tokens;
      tokens = tokens || [''];
      // Enforce the min and max heights for a multiline input to avoid measurement
      if (this.maxRows > 0 && tokens.length > this.maxRows) {
        _tokens = tokens.slice(0, this.maxRows);
      } else {
        _tokens = tokens.slice(0);
      }
      while (this.rows > 0 && _tokens.length < this.rows) {
        _tokens.push('');
      }
      // Use &#160; instead &nbsp; of to allow this element to be used in XHTML.
      return _tokens.join('<br/>') + '&#160;';
    },

    _valueForMirror: function() {
      var input = this.textarea;
      if (!input) {
        return;
      }
      this.tokens = (input && input.value) ? input.value.replace(/&/gm, '&amp;').replace(/"/gm, '&quot;').replace(/'/gm, '&#39;').replace(/</gm, '&lt;').replace(/>/gm, '&gt;').split('\n') : [''];
      return this._constrain(this.tokens);
    },

    _updateCached: function() {
      this.$.mirror.innerHTML = this._constrain(this.tokens);
    },

    _computeValue: function() {
      return this.bindValue;
    }
  });
Polymer({

    is: 'iron-collapse',

    properties: {

      /**
       * If true, the orientation is horizontal; otherwise is vertical.
       *
       * @attribute horizontal
       */
      horizontal: {
        type: Boolean,
        value: false,
        observer: '_horizontalChanged'
      },

      /**
       * Set opened to true to show the collapse element and to false to hide it.
       *
       * @attribute opened
       */
      opened: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_openedChanged'
      }

    },

    hostAttributes: {
      role: 'group',
      'aria-expanded': 'false'
    },

    listeners: {
      transitionend: '_transitionEnd'
    },

    ready: function() {
      // Avoid transition at the beginning e.g. page loads and enable
      // transitions only after the element is rendered and ready.
      this._enableTransition = true;
    },

    /**
     * Toggle the opened state.
     *
     * @method toggle
     */
    toggle: function() {
      this.opened = !this.opened;
    },

    show: function() {
      this.opened = true;    
    },

    hide: function() {
      this.opened = false;    
    },

    updateSize: function(size, animated) {
      this.enableTransition(animated);
      var s = this.style;
      var nochange = s[this.dimension] === size;
      s[this.dimension] = size;
      if (animated && nochange) {
        this._transitionEnd();
      }
    },

    enableTransition: function(enabled) {
      this.style.transitionDuration = (enabled && this._enableTransition) ? '' : '0s';
    },

    _horizontalChanged: function() {
      this.dimension = this.horizontal ? 'width' : 'height';
      this.style.transitionProperty = this.dimension;
    },

    _openedChanged: function() {
      if (this.opened) {
        this.setAttribute('aria-expanded', 'true');
        this.setAttribute('aria-hidden', 'false');

        this.toggleClass('iron-collapse-closed', false);
        this.updateSize('auto', false);
        var s = this._calcSize();
        this.updateSize('0px', false);
        // force layout to ensure transition will go
        /** @suppress {suspiciousCode} */ this.offsetHeight;
        this.updateSize(s, true);
        // focus the current collapse
        this.focus();
      } else {
        this.setAttribute('aria-expanded', 'false');
        this.setAttribute('aria-hidden', 'true');

        this.toggleClass('iron-collapse-opened', false);
        this.updateSize(this._calcSize(), false);
        // force layout to ensure transition will go
        /** @suppress {suspiciousCode} */ this.offsetHeight;
        this.updateSize('0px', true);
      }
    },

    _transitionEnd: function() {
      if (this.opened) {
        this.updateSize('auto', false);
      }
      this.toggleClass('iron-collapse-closed', !this.opened);
      this.toggleClass('iron-collapse-opened', this.opened);
      this.enableTransition(false);
    },

    _calcSize: function() {
      return this.getBoundingClientRect()[this.dimension] + 'px';
    },


  });
'use strict';

  Polymer({

    is: 'marked-element',

    properties: {

      /** The markdown source that should be rendered by this element. */
      markdown: {
        observer: 'render',
        type: String,
        value: null
      }

    },

    ready: function() {
      if (!this.markdown) {
        // Use the Markdown from the first `<script>` descendant whose MIME type starts with
        // "text/markdown". Script elements beyond the first are ignored.
        var markdownElement = Polymer.dom(this).querySelector('[type^="text/markdown"]');
        if (markdownElement != null) {
          this.markdown = this._unindent(markdownElement.textContent);
        }
      }
    },

    /**
     * Renders `markdown` to HTML when the element is attached.
     *
     * This serves a dual purpose:
     *
     *  * Prevents unnecessary work (no need to render when not visible).
     *
     *  * `attached` fires top-down, so we can give ancestors a chance to
     *    register listeners for the `syntax-highlight` event _before_ we render
     *    any markdown.
     *
     */
    attached: function() {
      this._attached = true;
      this._outputElement = this.outputElement;
      this.render();
    },

    detached: function() {
      this._attached = false;
    },

    get outputElement () {
      var child = Polymer.dom(this).queryDistributedElements('.markdown-html')[0];

      if (child)
        return child;

      this.toggleClass('hidden', false, this.$.content);
      return this.$.content;
    },

    /**
     * Renders `markdown` into this element's DOM.
     *
     * This is automatically called whenever the `markdown` property is changed.
     *
     * The only case where you should be calling this is if you are providing
     * markdown via `<script type="text/markdown">` after this element has been
     * constructed (or updating that markdown).
     */
    render: function() {
      if (!this._attached) return;
      if (!this.markdown) {
        Polymer.dom(this._outputElement).innerHTML = '';
        return;
      }

      Polymer.dom(this._outputElement).innerHTML = marked(this.markdown, {
        highlight: this._highlight.bind(this),
      });
    },

    _highlight: function(code, lang) {
      var event = this.fire('syntax-highlight', {code: code, lang: lang});
      return event.detail.code || code;
    },

    _unindent: function(text) {
      if (!text) return text;
      var lines  = text.replace(/\t/g, '  ').split('\n');
      var indent = lines.reduce(function(prev, line) {
        if (/^\s*$/.test(line)) return prev;  // Completely ignore blank lines.

        var lineIndent = line.match(/^(\s*)/)[0].length;
        if (prev === null) return lineIndent;
        return lineIndent < prev ? lineIndent : prev;
      }, null);

      return lines.map(function(l) { return l.substr(indent); }).join('\n');
    },

  });
(function() {

  Polymer({

    is: 'iron-doc-property',

    properties: {

      /**
       * The [Hydrolysis](https://github.com/PolymerLabs/hydrolysis)-generated
       * element descriptor to display details for.
       *
       * Alternatively, the element descriptor can be provided as JSON via the text content
       * of this element.
       *
       * @type {hydrolysis.PropertyDescriptor}
       */
      descriptor: {
        type:     Object,
        observer: '_descriptorChanged',
      },

      /**
       * Whether the property should show a one-liner, or full summary.
       *
       * Note that this property _is_ reflected as an attribute, but we perform
       * the reflection manually. In order to support the CSS transitions, we
       * must calculate the element height before setting the attribute.
       */
      collapsed: {
        type:     Boolean,
        value:    false,
        observer: '_collapsedChanged',
      },

    },

    listeners: {
      'transitionEnd':       '_onTransitionEnd',
      'webkitTransitionEnd': '_onTransitionEnd',
    },

    ready: function() {
      this._isReady = true;
    },

    /**
     * Resets any state that was set up for transitions.
     *
     * We are careful to reset our explicit heights after a transition
     * completes, so that the property doesn't clip values if the user resizes
     * their viewport.
     */
    _onTransitionEnd: function(event) {
      if (event.path[0] !== this.$.transitionMask) return;
      this.$.transitionMask.style.height = '';
    },

    _descriptorChanged: function() {
      this.toggleAttribute('private',       this.descriptor.private);
      this.toggleAttribute('configuration', this.descriptor.configuration);
      this.toggleAttribute('function',      this.descriptor.function);
      this._paramText = (this.descriptor.params || []).map(function(param) {
        return param.name;
      }).join(', ');
    },

    /**
     * Reflects `collapsed` as the `_collapsed` attribute.
     *
     * "Why not use `reflectToAttribute: true`?", you ask? A fine question!
     *
     * We avoid simple reflection purely because there is no purely declarative
     * way of transitioning to/from `height: auto`. This callback manages
     * setting explicit heights for the property so that CSS can interpolate it.
     *
     * @see #_onTransitionEnd
     */
    _collapsedChanged: function() {
      if (!this._isReady) {
        this.toggleAttribute('_collapsed', this.collapsed);
        return;
      }

      var container = this.$.transitionMask;
      var collapsed = this.collapsed;

      // Measure `height: auto`, which we will need regardless of transition
      // direction. We assume that the collapsed state has an explicit height
      // set via CSS rules; so we do not bother measuring that.
      container.style.height = 'auto';
      var fullHeight = container.offsetHeight;

      // Then, we reset to the start state. Changing directions mid-transition
      // is _not_ supported!
      if (this.collapsed) {
        container.style.height = fullHeight + 'px'; // Height 'auto'.
      } else {
        container.style.height = ''; // Height specified by CSS rule.
      }

      // We must wait a frame so that the transition engine has a chance to know
      // that something actually changed.
      requestAnimationFrame(function() {
        this.toggleAttribute('_collapsed', collapsed);
        if (this.collapsed) {
          container.style.height = ''; // Height specified by CSS rule.
        } else {
          container.style.height = fullHeight + 'px'; // Height 'auto'.
        }
      }.bind(this));
    },

    // hidden if no type and no defaults
    _computeHideMeta: function(descriptor) {
      return descriptor.type === undefined &&  descriptor.default === undefined;
    },

    // hidden if no params, and no return value
    _computeHideParams: function(descriptor,ret) {
      return (!descriptor.params || descriptor.params.length === 0) && !ret;
    },

    _computeHideDefault: function(def) {
      return def === undefined;
    },

    _computeDefaultDisplay: function(def) {
      if (def === '')
        return "''";
      return def;
    },

    _getAnnotation: function(descriptor) {
      var annotations = [];

      if (descriptor['default'] !== undefined) {
        annotations.push('Default: ' + descriptor['default']);
      }
      if (descriptor.readOnly) {
        annotations.push('readOnly');
      }
      if (descriptor.notify) {
        annotations.push('notifies');
      }
      return annotations.join(' – ');
    }

  });

})();
Polymer({
    is: 'paper-material',

    properties: {
      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        value: 1
      },

      /**
       * Set this to true to animate the shadow when setting a new
       * `elevation` value.
       *
       * @attribute animated
       * @type boolean
       * @default false
       */
      animated: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      }
    }
  });
(function() {
    var Utility = {
      distance: function(x1, y1, x2, y2) {
        var xDelta = (x1 - x2);
        var yDelta = (y1 - y2);

        return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
      },

      now: window.performance && window.performance.now ?
          window.performance.now.bind(window.performance) : Date.now
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function ElementMetrics(element) {
      this.element = element;
      this.width = this.boundingRect.width;
      this.height = this.boundingRect.height;

      this.size = Math.max(this.width, this.height);
    }

    ElementMetrics.prototype = {
      get boundingRect () {
        return this.element.getBoundingClientRect();
      },

      furthestCornerDistanceFrom: function(x, y) {
        var topLeft = Utility.distance(x, y, 0, 0);
        var topRight = Utility.distance(x, y, this.width, 0);
        var bottomLeft = Utility.distance(x, y, 0, this.height);
        var bottomRight = Utility.distance(x, y, this.width, this.height);

        return Math.max(topLeft, topRight, bottomLeft, bottomRight);
      }
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function Ripple(element) {
      this.element = element;
      this.color = window.getComputedStyle(element).color;

      this.wave = document.createElement('div');
      this.waveContainer = document.createElement('div');
      this.wave.style.backgroundColor = this.color;
      this.wave.classList.add('wave');
      this.waveContainer.classList.add('wave-container');
      Polymer.dom(this.waveContainer).appendChild(this.wave);

      this.resetInteractionState();
    }

    Ripple.MAX_RADIUS = 300;

    Ripple.prototype = {
      get recenters() {
        return this.element.recenters;
      },

      get center() {
        return this.element.center;
      },

      get mouseDownElapsed() {
        var elapsed;

        if (!this.mouseDownStart) {
          return 0;
        }

        elapsed = Utility.now() - this.mouseDownStart;

        if (this.mouseUpStart) {
          elapsed -= this.mouseUpElapsed;
        }

        return elapsed;
      },

      get mouseUpElapsed() {
        return this.mouseUpStart ?
          Utility.now () - this.mouseUpStart : 0;
      },

      get mouseDownElapsedSeconds() {
        return this.mouseDownElapsed / 1000;
      },

      get mouseUpElapsedSeconds() {
        return this.mouseUpElapsed / 1000;
      },

      get mouseInteractionSeconds() {
        return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
      },

      get initialOpacity() {
        return this.element.initialOpacity;
      },

      get opacityDecayVelocity() {
        return this.element.opacityDecayVelocity;
      },

      get radius() {
        var width2 = this.containerMetrics.width * this.containerMetrics.width;
        var height2 = this.containerMetrics.height * this.containerMetrics.height;
        var waveRadius = Math.min(
          Math.sqrt(width2 + height2),
          Ripple.MAX_RADIUS
        ) * 1.1 + 5;

        var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
        var timeNow = this.mouseInteractionSeconds / duration;
        var size = waveRadius * (1 - Math.pow(80, -timeNow));

        return Math.abs(size);
      },

      get opacity() {
        if (!this.mouseUpStart) {
          return this.initialOpacity;
        }

        return Math.max(
          0,
          this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity
        );
      },

      get outerOpacity() {
        // Linear increase in background opacity, capped at the opacity
        // of the wavefront (waveOpacity).
        var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
        var waveOpacity = this.opacity;

        return Math.max(
          0,
          Math.min(outerOpacity, waveOpacity)
        );
      },

      get isOpacityFullyDecayed() {
        return this.opacity < 0.01 &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isRestingAtMaxRadius() {
        return this.opacity >= this.initialOpacity &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isAnimationComplete() {
        return this.mouseUpStart ?
          this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
      },

      get translationFraction() {
        return Math.min(
          1,
          this.radius / this.containerMetrics.size * 2 / Math.sqrt(2)
        );
      },

      get xNow() {
        if (this.xEnd) {
          return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
        }

        return this.xStart;
      },

      get yNow() {
        if (this.yEnd) {
          return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
        }

        return this.yStart;
      },

      get isMouseDown() {
        return this.mouseDownStart && !this.mouseUpStart;
      },

      resetInteractionState: function() {
        this.maxRadius = 0;
        this.mouseDownStart = 0;
        this.mouseUpStart = 0;

        this.xStart = 0;
        this.yStart = 0;
        this.xEnd = 0;
        this.yEnd = 0;
        this.slideDistance = 0;

        this.containerMetrics = new ElementMetrics(this.element);
      },

      draw: function() {
        var scale;
        var translateString;
        var dx;
        var dy;

        this.wave.style.opacity = this.opacity;

        scale = this.radius / (this.containerMetrics.size / 2);
        dx = this.xNow - (this.containerMetrics.width / 2);
        dy = this.yNow - (this.containerMetrics.height / 2);


        // 2d transform for safari because of border-radius and overflow:hidden clipping bug.
        // https://bugs.webkit.org/show_bug.cgi?id=98538
        this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
        this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
        this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
        this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
      },

      /** @param {Event=} event */
      downAction: function(event) {
        var xCenter = this.containerMetrics.width / 2;
        var yCenter = this.containerMetrics.height / 2;

        this.resetInteractionState();
        this.mouseDownStart = Utility.now();

        if (this.center) {
          this.xStart = xCenter;
          this.yStart = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        } else {
          this.xStart = event ?
              event.detail.x - this.containerMetrics.boundingRect.left :
              this.containerMetrics.width / 2;
          this.yStart = event ?
              event.detail.y - this.containerMetrics.boundingRect.top :
              this.containerMetrics.height / 2;
        }

        if (this.recenters) {
          this.xEnd = xCenter;
          this.yEnd = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        }

        this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(
          this.xStart,
          this.yStart
        );

        this.waveContainer.style.top =
          (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
        this.waveContainer.style.left =
          (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';

        this.waveContainer.style.width = this.containerMetrics.size + 'px';
        this.waveContainer.style.height = this.containerMetrics.size + 'px';
      },

      /** @param {Event=} event */
      upAction: function(event) {
        if (!this.isMouseDown) {
          return;
        }

        this.mouseUpStart = Utility.now();
      },

      remove: function() {
        Polymer.dom(this.waveContainer.parentNode).removeChild(
          this.waveContainer
        );
      }
    };

    Polymer({
      is: 'paper-ripple',

      behaviors: [
        Polymer.IronA11yKeysBehavior
      ],

      properties: {
        /**
         * The initial opacity set on the wave.
         *
         * @attribute initialOpacity
         * @type number
         * @default 0.25
         */
        initialOpacity: {
          type: Number,
          value: 0.25
        },

        /**
         * How fast (opacity per second) the wave fades out.
         *
         * @attribute opacityDecayVelocity
         * @type number
         * @default 0.8
         */
        opacityDecayVelocity: {
          type: Number,
          value: 0.8
        },

        /**
         * If true, ripples will exhibit a gravitational pull towards
         * the center of their container as they fade away.
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        recenters: {
          type: Boolean,
          value: false
        },

        /**
         * If true, ripples will center inside its container
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        center: {
          type: Boolean,
          value: false
        },

        /**
         * A list of the visual ripples.
         *
         * @attribute ripples
         * @type Array
         * @default []
         */
        ripples: {
          type: Array,
          value: function() {
            return [];
          }
        },

        /**
         * True when there are visible ripples animating within the
         * element.
         */
        animating: {
          type: Boolean,
          readOnly: true,
          reflectToAttribute: true,
          value: false
        },

        /**
         * If true, the ripple will remain in the "down" state until `holdDown`
         * is set to false again.
         */
        holdDown: {
          type: Boolean,
          value: false,
          observer: '_holdDownChanged'
        },

        /**
         * If true, the ripple will not generate a ripple effect
         * via pointer interaction.
         * Calling ripple's imperative api like `simulatedRipple` will
         * still generate the ripple effect.
         */
        noink: {
          type: Boolean,
          value: false
        },

        _animating: {
          type: Boolean
        },

        _boundAnimate: {
          type: Function,
          value: function() {
            return this.animate.bind(this);
          }
        }
      },

      observers: [
        '_noinkChanged(noink, isAttached)'
      ],

      get target () {
        var ownerRoot = Polymer.dom(this).getOwnerRoot();
        var target;

        if (this.parentNode.nodeType == 11) { // DOCUMENT_FRAGMENT_NODE
          target = ownerRoot.host;
        } else {
          target = this.parentNode;
        }

        return target;
      },

      keyBindings: {
        'enter:keydown': '_onEnterKeydown',
        'space:keydown': '_onSpaceKeydown',
        'space:keyup': '_onSpaceKeyup'
      },

      attached: function() {
        this.listen(this.target, 'up', 'uiUpAction');
        this.listen(this.target, 'down', 'uiDownAction');
      },

      detached: function() {
        this.unlisten(this.target, 'up', 'uiUpAction');
        this.unlisten(this.target, 'down', 'uiDownAction');
      },

      get shouldKeepAnimating () {
        for (var index = 0; index < this.ripples.length; ++index) {
          if (!this.ripples[index].isAnimationComplete) {
            return true;
          }
        }

        return false;
      },

      simulatedRipple: function() {
        this.downAction(null);

        // Please see polymer/polymer#1305
        this.async(function() {
          this.upAction();
        }, 1);
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiDownAction: function(event) {
        if (!this.noink) {
          this.downAction(event);
        }
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      downAction: function(event) {
        if (this.holdDown && this.ripples.length > 0) {
          return;
        }

        var ripple = this.addRipple();

        ripple.downAction(event);

        if (!this._animating) {
          this.animate();
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiUpAction: function(event) {
        if (!this.noink) {
          this.upAction(event);
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      upAction: function(event) {
        if (this.holdDown) {
          return;
        }

        this.ripples.forEach(function(ripple) {
          ripple.upAction(event);
        });

        this.animate();
      },

      onAnimationComplete: function() {
        this._animating = false;
        this.$.background.style.backgroundColor = null;
        this.fire('transitionend');
      },

      addRipple: function() {
        var ripple = new Ripple(this);

        Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
        this.$.background.style.backgroundColor = ripple.color;
        this.ripples.push(ripple);

        this._setAnimating(true);

        return ripple;
      },

      removeRipple: function(ripple) {
        var rippleIndex = this.ripples.indexOf(ripple);

        if (rippleIndex < 0) {
          return;
        }

        this.ripples.splice(rippleIndex, 1);

        ripple.remove();

        if (!this.ripples.length) {
          this._setAnimating(false);
        }
      },

      animate: function() {
        var index;
        var ripple;

        this._animating = true;

        for (index = 0; index < this.ripples.length; ++index) {
          ripple = this.ripples[index];

          ripple.draw();

          this.$.background.style.opacity = ripple.outerOpacity;

          if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
            this.removeRipple(ripple);
          }
        }

        if (!this.shouldKeepAnimating && this.ripples.length === 0) {
          this.onAnimationComplete();
        } else {
          window.requestAnimationFrame(this._boundAnimate);
        }
      },

      _onEnterKeydown: function() {
        this.uiDownAction();
        this.async(this.uiUpAction, 1);
      },

      _onSpaceKeydown: function() {
        this.uiDownAction();
      },

      _onSpaceKeyup: function() {
        this.uiUpAction();
      },

      // note: holdDown does not respect noink since it can be a focus based
      // effect.
      _holdDownChanged: function(newVal, oldVal) {
        if (oldVal === undefined) {
          return;
        }
        if (newVal) {
          this.downAction();
        } else {
          this.upAction();
        }
      },

      _noinkChanged: function(noink, attached) {
        if (attached) {
          this.keyEventTarget = noink ? this : this.target;
        }
      }
    });
  })();
Polymer({
    is: 'paper-button',

    behaviors: [
      Polymer.PaperButtonBehavior
    ],

    properties: {
      /**
       * If true, the button should be styled with a shadow.
       */
      raised: {
        type: Boolean,
        reflectToAttribute: true,
        value: false,
        observer: '_calculateElevation'
      }
    },

    _calculateElevation: function() {
      if (!this.raised) {
        this.elevation = 0;
      } else {
        Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
      }
    }
  });
(function() {

  Polymer({

    is: 'iron-doc-viewer',

    properties: {

      /**
       * The [Hydrolysis](https://github.com/PolymerLabs/hydrolysis)-generated
       * element descriptor to display details for.
       *
       * Alternatively, the element descriptor can be provided as JSON via the text content
       * of this element.
       *
       * @type {hydrolysis.ElementDescriptor}
       */
      descriptor: {
        type: Object,
        observer: '_descriptorChanged',
      },

      /** Whether private properties should be hidden or shown. */
      _showPrivate: {
        type:     Boolean,
        value:    false,
        observer: '_showPrivateChanged',
      },

      /** The label to show for the Private API toggle. */
      _privateToggleLabel: String,

      /**
       * Broadcast when another component is clicked on
       * @param {String} detail name of the component
       * iron-doc-viewer container should load component if possible
       * @event iron-doc-viewer-component-selected
       */
    },

    ready: function() {
      var jsonDescriptor = this._loadJson();
      // Note that this is only an error during element creation. You are free
      // to stomp over the descriptor after it is ready.
      if (jsonDescriptor && this.descriptor) {
        console.error(
            this,
            'received both a bound descriptor:', this.descriptor,
            'and JSON descriptor:', this._jsonDescriptor,
            'Please provide only one');
        throw new Error(
            '<iron-doc-viewer> accepts either a bound or JSON descriptor; not both');
      }

      if (jsonDescriptor) {
        this.descriptor = jsonDescriptor;
      }
    },

    /**
     * Loads a hydrolysis element descriptor (as JSON) from the text content of
     * this element, if present.
     *
     * @return {hydrolysis.ElementDescriptor} The parsed descriptor, or `null`.
     */
    _loadJson: function() {
      var textContent = '';
      Array.prototype.forEach.call(Polymer.dom(this).childNodes, function(node) {
        textContent = textContent + node.textContent;
      });
      textContent = textContent.trim();
      if (textContent === '') return null;

      try {
        return JSON.parse(textContent);
      } catch(error) {
        console.error('Failure when parsing JSON:', textContent, error);
        throw error;
      }
    },

    /** Converts `descriptor` into our template-friendly `_model`. */
    _descriptorChanged: function() {
      if (!this.descriptor) return;

      // Split the documented properties between functions and other types.
      var properties = [];
      var methods    = [];

      for (var i = 0, property; property = this.descriptor.properties[i]; i++) {
        (property.type === 'Function' ? methods : properties).push(property);
      }
      this._properties = properties;
      this._methods    = methods;
      this._events     = this.descriptor.events || [];
      this._behaviors  = this.descriptor.behaviors || [];

      this.toggleAttribute('abstract', this.descriptor.abstract);
    },

    _collapsedChanged: function() {
      this._collapseToggleLabel = this._collapsed ? 'expand' : 'collapse';

      // Bound values aren't exposed to dom-repeat's scope.
      var properties = this.querySelectorAll('iron-doc-property');
      for (var i = 0, property; property = properties[i]; i++) {
        property.collapsed = this._collapsed;
      }
    },

    _toggleCollapsed: function() {
      this._collapsed = !this._collapsed;
    },

    _showPrivateChanged: function() {
      this._privateToggleLabel = (this._showPrivate ? 'hide' : 'show') + ' private API';
      this.toggleClass('show-private', this._showPrivate);
    },

    _togglePrivate: function() {
      this._showPrivate = !this._showPrivate;
    },

    _noneToShow: function(showPrivate, items) {
      for (var i = 0; i < items.length; i++) {
        if (showPrivate || !items[i].private) return false;
      }
      return true;
    },

    _hideBehaviors: function(behaviors) {
      return behaviors === null || behaviors.length === 0;
    },

    _broadcastBehavior: function(ev) {
      this.fire('iron-doc-viewer-component-selected', ev.target._templateInstance.item);
    }
  });

})();
(function() {

  Polymer({

    is: 'iron-overlay-backdrop',

    properties: {

      /**
       * Returns true if the backdrop is opened.
       */
      opened: {
        readOnly: true,
        reflectToAttribute: true,
        type: Boolean,
        value: false
      },

      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      }

    },

    /**
     * Appends the backdrop to document body and sets its `z-index` to be below the latest overlay.
     */
    prepare: function() {
      if (!this.parentNode) {
        Polymer.dom(document.body).appendChild(this);
        this.style.zIndex = this._manager.currentOverlayZ() - 1;
      }
    },

    /**
     * Shows the backdrop if needed.
     */
    open: function() {
      // only need to make the backdrop visible if this is called by the first overlay with a backdrop
      if (this._manager.getBackdrops().length < 2) {
        this._setOpened(true);
      }
    },

    /**
     * Hides the backdrop if needed.
     */
    close: function() {
      // only need to make the backdrop invisible if this is called by the last overlay with a backdrop
      if (this._manager.getBackdrops().length < 2) {
        this._setOpened(false);
      }
    },

    /**
     * Removes the backdrop from document body if needed.
     */
    complete: function() {
      // only remove the backdrop if there are no more overlays with backdrops
      if (this._manager.getBackdrops().length === 0 && this.parentNode) {
        Polymer.dom(this.parentNode).removeChild(this);
      }
    }

  });

})();
(function() {
      'use strict';

      Polymer({
        is: 'iron-dropdown',

        behaviors: [
          Polymer.IronControlState,
          Polymer.IronA11yKeysBehavior,
          Polymer.IronOverlayBehavior,
          Polymer.NeonAnimationRunnerBehavior
        ],

        properties: {
          /**
           * The orientation against which to align the dropdown content
           * horizontally relative to the dropdown trigger.
           */
          horizontalAlign: {
            type: String,
            value: 'left',
            reflectToAttribute: true
          },

          /**
           * The orientation against which to align the dropdown content
           * vertically relative to the dropdown trigger.
           */
          verticalAlign: {
            type: String,
            value: 'top',
            reflectToAttribute: true
          },

          /**
           * A pixel value that will be added to the position calculated for the
           * given `horizontalAlign`. Use a negative value to offset to the
           * left, or a positive value to offset to the right.
           */
          horizontalOffset: {
            type: Number,
            value: 0,
            notify: true
          },

          /**
           * A pixel value that will be added to the position calculated for the
           * given `verticalAlign`. Use a negative value to offset towards the
           * top, or a positive value to offset towards the bottom.
           */
          verticalOffset: {
            type: Number,
            value: 0,
            notify: true
          },

          /**
           * The element that should be used to position the dropdown when
           * it is opened.
           */
          positionTarget: {
            type: Object,
            observer: '_positionTargetChanged'
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * opening of the dropdown.
           */
          openAnimationConfig: {
            type: Object
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * closing of the dropdown.
           */
          closeAnimationConfig: {
            type: Object
          },

          /**
           * If provided, this will be the element that will be focused when
           * the dropdown opens.
           */
          focusTarget: {
            type: Object
          },

          /**
           * Set to true to disable animations when opening and closing the
           * dropdown.
           */
          noAnimations: {
            type: Boolean,
            value: false
          },

          /**
           * By default, the dropdown will constrain scrolling on the page
           * to itself when opened.
           * Set to true in order to prevent scroll from being constrained
           * to the dropdown when it opens.
           */
          allowOutsideScroll: {
            type: Boolean,
            value: false
          },

          /**
           * We memoize the positionTarget bounding rectangle so that we can
           * limit the number of times it is queried per resize / relayout.
           * @type {?Object}
           */
          _positionRectMemo: {
            type: Object
          }
        },

        listeners: {
          'neon-animation-finish': '_onNeonAnimationFinish'
        },

        observers: [
          '_updateOverlayPosition(verticalAlign, horizontalAlign, verticalOffset, horizontalOffset)'
        ],

        attached: function() {
          if (this.positionTarget === undefined) {
            this.positionTarget = this._defaultPositionTarget;
          }
        },

        /**
         * The element that is contained by the dropdown, if any.
         */
        get containedElement() {
          return Polymer.dom(this.$.content).getDistributedNodes()[0];
        },

        /**
         * The element that should be focused when the dropdown opens.
         */
        get _focusTarget() {
          return this.focusTarget || this.containedElement;
        },

        /**
         * The element that should be used to position the dropdown when
         * it opens, if no position target is configured.
         */
        get _defaultPositionTarget() {
          var parent = Polymer.dom(this).parentNode;

          if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            parent = parent.host;
          }

          return parent;
        },

        /**
         * The bounding rect of the position target.
         */
        get _positionRect() {
          if (!this._positionRectMemo && this.positionTarget) {
            this._positionRectMemo = this.positionTarget.getBoundingClientRect();
          }

          return this._positionRectMemo;
        },

        /**
         * The horizontal offset value used to position the dropdown.
         */
        get _horizontalAlignTargetValue() {
          var target;

          if (this.horizontalAlign === 'right') {
            target = document.documentElement.clientWidth - this._positionRect.right;
          } else {
            target = this._positionRect.left;
          }

          target += this.horizontalOffset;

          return Math.max(target, 0);
        },

        /**
         * The vertical offset value used to position the dropdown.
         */
        get _verticalAlignTargetValue() {
          var target;

          if (this.verticalAlign === 'bottom') {
            target = document.documentElement.clientHeight - this._positionRect.bottom;
          } else {
            target = this._positionRect.top;
          }

          target += this.verticalOffset;

          return Math.max(target, 0);
        },

        /**
         * Called when the value of `opened` changes.
         *
         * @param {boolean} opened True if the dropdown is opened.
         */
        _openedChanged: function(opened) {
          if (opened && this.disabled) {
            this.cancel();
          } else {
            this.cancelAnimation();
            this._prepareDropdown();
            Polymer.IronOverlayBehaviorImpl._openedChanged.apply(this, arguments);
          }

          if (this.opened) {
            this._focusContent();
          }
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderOpened: function() {
          if (!this.allowOutsideScroll) {
            Polymer.IronDropdownScrollManager.pushScrollLock(this);
          }

          if (!this.noAnimations && this.animationConfig && this.animationConfig.open) {
            this.$.contentWrapper.classList.add('animating');
            this.playAnimation('open');
          } else {
            Polymer.IronOverlayBehaviorImpl._renderOpened.apply(this, arguments);
          }
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderClosed: function() {
          Polymer.IronDropdownScrollManager.removeScrollLock(this);
          if (!this.noAnimations && this.animationConfig && this.animationConfig.close) {
            this.$.contentWrapper.classList.add('animating');
            this.playAnimation('close');
          } else {
            Polymer.IronOverlayBehaviorImpl._renderClosed.apply(this, arguments);
          }
        },

        /**
         * Called when animation finishes on the dropdown (when opening or
         * closing). Responsible for "completing" the process of opening or
         * closing the dropdown by positioning it or setting its display to
         * none.
         */
        _onNeonAnimationFinish: function() {
          this.$.contentWrapper.classList.remove('animating');
          if (this.opened) {
            Polymer.IronOverlayBehaviorImpl._renderOpened.apply(this);
          } else {
            Polymer.IronOverlayBehaviorImpl._renderClosed.apply(this);
          }
        },

        /**
         * Called when an `iron-resize` event fires.
         */
        _onIronResize: function() {
          var containedElement = this.containedElement;
          var scrollTop;
          var scrollLeft;

          if (containedElement) {
            scrollTop = containedElement.scrollTop;
            scrollLeft = containedElement.scrollLeft;
          }

          if (this.opened) {
            this._updateOverlayPosition();
          }

          Polymer.IronOverlayBehaviorImpl._onIronResize.apply(this, arguments);

          if (containedElement) {
            containedElement.scrollTop = scrollTop;
            containedElement.scrollLeft = scrollLeft;
          }
        },

        /**
         * Called when the `positionTarget` property changes.
         */
        _positionTargetChanged: function() {
          this._updateOverlayPosition();
        },

        /**
         * Constructs the final animation config from different properties used
         * to configure specific parts of the opening and closing animations.
         */
        _updateAnimationConfig: function() {
          var animationConfig = {};
          var animations = [];

          if (this.openAnimationConfig) {
            // NOTE(cdata): When making `display:none` elements visible in Safari,
            // the element will paint once in a fully visible state, causing the
            // dropdown to flash before it fades in. We prepend an
            // `opaque-animation` to fix this problem:
            animationConfig.open = [{
              name: 'opaque-animation',
            }].concat(this.openAnimationConfig);
            animations = animations.concat(animationConfig.open);
          }

          if (this.closeAnimationConfig) {
            animationConfig.close = this.closeAnimationConfig;
            animations = animations.concat(animationConfig.close);
          }

          animations.forEach(function(animation) {
            animation.node = this.containedElement;
          }, this);

          this.animationConfig = animationConfig;
        },

        /**
         * Prepares the dropdown for opening by updating measured layout
         * values.
         */
        _prepareDropdown: function() {
          this.sizingTarget = this.containedElement || this.sizingTarget;
          this._updateAnimationConfig();
          this._updateOverlayPosition();
        },

        /**
         * Updates the overlay position based on configured horizontal
         * and vertical alignment, and re-memoizes these values for the sake
         * of behavior in `IronFitBehavior`.
         */
        _updateOverlayPosition: function() {
          this._positionRectMemo = null;

          if (!this.positionTarget) {
            return;
          }

          this.style[this.horizontalAlign] =
            this._horizontalAlignTargetValue + 'px';

          this.style[this.verticalAlign] =
            this._verticalAlignTargetValue + 'px';

          // NOTE(cdata): We re-memoize inline styles here, otherwise
          // calling `refit` from `IronFitBehavior` will reset inline styles
          // to whatever they were when the dropdown first opened.
          if (this._fitInfo) {
            this._fitInfo.inlineStyle[this.horizontalAlign] =
              this.style[this.horizontalAlign];

            this._fitInfo.inlineStyle[this.verticalAlign] =
              this.style[this.verticalAlign];
          }
        },

        /**
         * Focuses the configured focus target.
         */
        _focusContent: function() {
          // NOTE(cdata): This is async so that it can attempt the focus after
          // `display: none` is removed from the element.
          this.async(function() {
            if (this._focusTarget) {
              this._focusTarget.focus();
            }
          });
        }
      });
    })();
(function() {

  var IOS = navigator.userAgent.match(/iP(?:hone|ad;(?: U;)? CPU) OS (\d+)/);
  var IOS_TOUCH_SCROLLING = IOS && IOS[1] >= 8;
  var DEFAULT_PHYSICAL_COUNT = 20;
  var MAX_PHYSICAL_COUNT = 500;

  Polymer({

    is: 'iron-list',

    properties: {

      /**
       * An array containing items determining how many instances of the template
       * to stamp and that that each template instance should bind to.
       */
      items: {
        type: Array
      },

      /**
       * The name of the variable to add to the binding scope for the array
       * element associated with a given template instance.
       */
      as: {
        type: String,
        value: 'item'
      },

      /**
       * The name of the variable to add to the binding scope with the index
       * for the row.
       */
      indexAs: {
        type: String,
        value: 'index'
      },

      /**
       * The name of the variable to add to the binding scope to indicate
       * if the row is selected.
       */
      selectedAs: {
        type: String,
        value: 'selected'
      },

      /**
       * When true, tapping a row will select the item, placing its data model
       * in the set of selected items retrievable via the selection property.
       *
       * Note that tapping focusable elements within the list item will not
       * result in selection, since they are presumed to have their * own action.
       */
      selectionEnabled: {
        type: Boolean,
        value: false
      },

      /**
       * When `multiSelection` is false, this is the currently selected item, or `null`
       * if no item is selected.
       */
      selectedItem: {
        type: Object,
        notify: true
      },

      /**
       * When `multiSelection` is true, this is an array that contains the selected items.
       */
      selectedItems: {
        type: Object,
        notify: true
      },

      /**
       * When `true`, multiple items may be selected at once (in this case,
       * `selected` is an array of currently selected items).  When `false`,
       * only one item may be selected at a time.
       */
      multiSelection: {
        type: Boolean,
        value: false
      }
    },

    observers: [
      '_itemsChanged(items.*)',
      '_selectionEnabledChanged(selectionEnabled)',
      '_multiSelectionChanged(multiSelection)'
    ],

    behaviors: [
      Polymer.Templatizer,
      Polymer.IronResizableBehavior
    ],

    listeners: {
      'iron-resize': '_resizeHandler'
    },

    /**
     * The ratio of hidden tiles that should remain in the scroll direction.
     * Recommended value ~0.5, so it will distribute tiles evely in both directions.
     */
    _ratio: 0.5,

    /**
     * The element that controls the scroll
     * @type {?Element}
     */
    _scroller: null,

    /**
     * The padding-top value of the `scroller` element
     */
    _scrollerPaddingTop: 0,

    /**
     * This value is the same as `scrollTop`.
     */
    _scrollPosition: 0,

    /**
     * The number of tiles in the DOM.
     */
    _physicalCount: 0,

    /**
     * The k-th tile that is at the top of the scrolling list.
     */
    _physicalStart: 0,

    /**
     * The k-th tile that is at the bottom of the scrolling list.
     */
    _physicalEnd: 0,

    /**
     * The sum of the heights of all the tiles in the DOM.
     */
    _physicalSize: 0,

    /**
     * The average `offsetHeight` of the tiles observed till now.
     */
    _physicalAverage: 0,

    /**
     * The number of tiles which `offsetHeight` > 0 observed until now.
     */
    _physicalAverageCount: 0,

    /**
     * The Y position of the item rendered in the `_physicalStart`
     * tile relative to the scrolling list.
     */
    _physicalTop: 0,

    /**
     * The number of items in the list.
     */
    _virtualCount: 0,

    /**
     * The n-th item rendered in the `_physicalStart` tile.
     */
    _virtualStartVal: 0,

    /**
     * A map between an item key and its physical item index
     */
    _physicalIndexForKey: null,

    /**
     * The estimated scroll height based on `_physicalAverage`
     */
    _estScrollHeight: 0,

    /**
     * The scroll height of the dom node
     */
    _scrollHeight: 0,

    /**
     * The size of the viewport
     */
    _viewportSize: 0,

    /**
     * An array of DOM nodes that are currently in the tree
     * @type {?Array<!TemplatizerNode>}
     */
    _physicalItems: null,

    /**
     * An array of heights for each item in `_physicalItems`
     * @type {?Array<number>}
     */
    _physicalSizes: null,

    /**
     * A cached value for the visible index.
     * See `firstVisibleIndex`
     * @type {?number}
     */
    _firstVisibleIndexVal: null,

    /**
     * A Polymer collection for the items.
     * @type {?Polymer.Collection}
     */
    _collection: null,

    /**
     * True if the current item list was rendered for the first time
     * after attached.
     */
    _itemsRendered: false,

    /**
     * The bottom of the physical content.
     */
    get _physicalBottom() {
      return this._physicalTop + this._physicalSize;
    },

    /**
     * The bottom of the scroll.
     */
    get _scrollBottom() {
      return this._scrollPosition + this._viewportSize;
    },

    /**
     * The n-th item rendered in the last physical item.
     */
    get _virtualEnd() {
      return this._virtualStartVal + this._physicalCount - 1;
    },

    /**
     * The lowest n-th value for an item such that it can be rendered in `_physicalStart`.
     */
    _minVirtualStart: 0,

    /**
     * The largest n-th value for an item such that it can be rendered in `_physicalStart`.
     */
    get _maxVirtualStart() {
      return Math.max(0, this._virtualCount - this._physicalCount);
    },

    /**
     * The height of the physical content that isn't on the screen.
     */
    get _hiddenContentSize() {
      return this._physicalSize - this._viewportSize;
    },

    /**
     * The maximum scroll top value.
     */
    get _maxScrollTop() {
      return this._estScrollHeight - this._viewportSize;
    },

    /**
     * Sets the n-th item rendered in `_physicalStart`
     */
    set _virtualStart(val) {
      // clamp the value so that _minVirtualStart <= val <= _maxVirtualStart
      this._virtualStartVal = Math.min(this._maxVirtualStart, Math.max(this._minVirtualStart, val));
      this._physicalStart = this._virtualStartVal % this._physicalCount;
      this._physicalEnd = (this._physicalStart + this._physicalCount - 1) % this._physicalCount;
    },

    /**
     * Gets the n-th item rendered in `_physicalStart`
     */
    get _virtualStart() {
      return this._virtualStartVal;
    },

    /**
     * An optimal physical size such that we will have enough physical items
     * to fill up the viewport and recycle when the user scrolls.
     *
     * This default value assumes that we will at least have the equivalent
     * to a viewport of physical items above and below the user's viewport.
     */
    get _optPhysicalSize() {
      return this._viewportSize * 3;
    },

   /**
    * True if the current list is visible.
    */
    get _isVisible() {
      return this._scroller && Boolean(this._scroller.offsetWidth || this._scroller.offsetHeight);
    },

    /**
     * Gets the index of the first visible item in the viewport.
     *
     * @type {number}
     */
    get firstVisibleIndex() {
      var physicalOffset;

      if (this._firstVisibleIndexVal === null) {
        physicalOffset = this._physicalTop;

        this._firstVisibleIndexVal = this._iterateItems(
          function(pidx, vidx) {
            physicalOffset += this._physicalSizes[pidx];

            if (physicalOffset > this._scrollPosition) {
              return vidx;
            }
          }) || 0;
      }

      return this._firstVisibleIndexVal;
    },

    ready: function() {
      if (IOS_TOUCH_SCROLLING) {
        this._scrollListener = function() {
          requestAnimationFrame(this._scrollHandler.bind(this));
        }.bind(this);
      } else {
        this._scrollListener = this._scrollHandler.bind(this);
      }
    },

    /**
     * When the element has been attached to the DOM tree.
     */
    attached: function() {
      // delegate to the parent's scroller
      // e.g. paper-scroll-header-panel
      var el = Polymer.dom(this);

      var parentNode = /** @type {?{scroller: ?Element}} */ (el.parentNode);
      if (parentNode && parentNode.scroller) {
        this._scroller = parentNode.scroller;
      } else {
        this._scroller = this;
        this.classList.add('has-scroller');
      }

      if (IOS_TOUCH_SCROLLING) {
        this._scroller.style.webkitOverflowScrolling = 'touch';
      }

      this._scroller.addEventListener('scroll', this._scrollListener);

      this.updateViewportBoundaries();
      this._render();
    },

    /**
     * When the element has been removed from the DOM tree.
     */
    detached: function() {
      this._itemsRendered = false;
      if (this._scroller) {
        this._scroller.removeEventListener('scroll', this._scrollListener);
      }
    },

    /**
     * Invoke this method if you dynamically update the viewport's
     * size or CSS padding.
     *
     * @method updateViewportBoundaries
     */
    updateViewportBoundaries: function() {
      var scrollerStyle = window.getComputedStyle(this._scroller);
      this._scrollerPaddingTop = parseInt(scrollerStyle['padding-top'], 10);
      this._viewportSize = this._scroller.offsetHeight;
    },

    /**
     * Update the models, the position of the
     * items in the viewport and recycle tiles as needed.
     */
    _refresh: function() {
      // clamp the `scrollTop` value
      // IE 10|11 scrollTop may go above `_maxScrollTop`
      // iOS `scrollTop` may go below 0 and above `_maxScrollTop`
      var scrollTop = Math.max(0, Math.min(this._maxScrollTop, this._scroller.scrollTop));
      var tileHeight, tileTop, kth, recycledTileSet, scrollBottom;
      var ratio = this._ratio;
      var delta = scrollTop - this._scrollPosition;
      var recycledTiles = 0;
      var hiddenContentSize = this._hiddenContentSize;
      var currentRatio = ratio;
      var movingUp = [];

      // track the last `scrollTop`
      this._scrollPosition = scrollTop;

      // clear cached visible index
      this._firstVisibleIndexVal = null;

      scrollBottom = this._scrollBottom;

      // random access
      if (Math.abs(delta) > this._physicalSize) {
        this._physicalTop += delta;
        recycledTiles =  Math.round(delta / this._physicalAverage);
      }
      // scroll up
      else if (delta < 0) {
        var topSpace = scrollTop - this._physicalTop;
        var virtualStart = this._virtualStart;
        var physicalBottom = this._physicalBottom;

        recycledTileSet = [];

        kth = this._physicalEnd;
        currentRatio = topSpace / hiddenContentSize;

        // move tiles from bottom to top
        while (
            // approximate `currentRatio` to `ratio`
            currentRatio < ratio &&
            // recycle less physical items than the total
            recycledTiles < this._physicalCount &&
            // ensure that these recycled tiles are needed
            virtualStart - recycledTiles > 0 &&
            // ensure that the tile is not visible
            physicalBottom - this._physicalSizes[kth] > scrollBottom
        ) {

          tileHeight = this._physicalSizes[kth];
          currentRatio += tileHeight / hiddenContentSize;
          physicalBottom -= tileHeight;
          recycledTileSet.push(kth);
          recycledTiles++;
          kth = (kth === 0) ? this._physicalCount - 1 : kth - 1;
        }

        movingUp = recycledTileSet;
        recycledTiles = -recycledTiles;
      }
      // scroll down
      else if (delta > 0) {
        var bottomSpace = this._physicalBottom - scrollBottom;
        var virtualEnd = this._virtualEnd;
        var lastVirtualItemIndex = this._virtualCount-1;

        recycledTileSet = [];

        kth = this._physicalStart;
        currentRatio = bottomSpace / hiddenContentSize;

        // move tiles from top to bottom
        while (
            // approximate `currentRatio` to `ratio`
            currentRatio < ratio &&
            // recycle less physical items than the total
            recycledTiles < this._physicalCount &&
            // ensure that these recycled tiles are needed
            virtualEnd + recycledTiles < lastVirtualItemIndex &&
            // ensure that the tile is not visible
            this._physicalTop + this._physicalSizes[kth] < scrollTop
          ) {

          tileHeight = this._physicalSizes[kth];
          currentRatio += tileHeight / hiddenContentSize;

          this._physicalTop += tileHeight;
          recycledTileSet.push(kth);
          recycledTiles++;
          kth = (kth + 1) % this._physicalCount;
        }
      }

      if (recycledTiles === 0) {
        // If the list ever reach this case, the physical average is not significant enough
        // to create all the items needed to cover the entire viewport.
        // e.g. A few items have a height that differs from the average by serveral order of magnitude.
        if (this._increasePoolIfNeeded()) {
          // yield and set models to the new items
          this.async(this._update);
        }
      } else {
        this._virtualStart = this._virtualStart + recycledTiles;
        this._update(recycledTileSet, movingUp);
      }
    },

    /**
     * Update the list of items, starting from the `_virtualStartVal` item.
     * @param {!Array<number>=} itemSet
     * @param {!Array<number>=} movingUp
     */
    _update: function(itemSet, movingUp) {
      // update models
      this._assignModels(itemSet);

      // measure heights
      this._updateMetrics(itemSet);

      // adjust offset after measuring
      if (movingUp) {
        while (movingUp.length) {
          this._physicalTop -= this._physicalSizes[movingUp.pop()];
        }
      }
      // update the position of the items
      this._positionItems();

      // set the scroller size
      this._updateScrollerSize();

      // increase the pool of physical items if needed
      if (this._increasePoolIfNeeded()) {
        // yield set models to the new items
        this.async(this._update);
      }
    },

    /**
     * Creates a pool of DOM elements and attaches them to the local dom.
     */
    _createPool: function(size) {
      var physicalItems = new Array(size);

      this._ensureTemplatized();

      for (var i = 0; i < size; i++) {
        var inst = this.stamp(null);

        // First element child is item; Safari doesn't support children[0]
        // on a doc fragment
        physicalItems[i] = inst.root.querySelector('*');
        Polymer.dom(this).appendChild(inst.root);
      }

      return physicalItems;
    },

    /**
     * Increases the pool of physical items only if needed.
     * This function will allocate additional physical items
     * (limited by `MAX_PHYSICAL_COUNT`) if the content size is shorter than
     * `_optPhysicalSize`
     *
     * @return boolean
     */
    _increasePoolIfNeeded: function() {
      if (this._physicalAverage === 0) {
        return false;
      }
      if (this._physicalBottom < this._scrollBottom || this._physicalTop > this._scrollPosition) {
        return this._increasePool(1);
      }
      if (this._physicalSize < this._optPhysicalSize) {
        return this._increasePool(Math.round((this._optPhysicalSize - this._physicalSize) * 1.2 / this._physicalAverage));
      }
      return false;
    },

    /**
     * Increases the pool size.
     */
    _increasePool: function(missingItems) {
      // limit the size
      var nextPhysicalCount = Math.min(
          this._physicalCount + missingItems,
          this._virtualCount,
          MAX_PHYSICAL_COUNT
        );

      var prevPhysicalCount = this._physicalCount;
      var delta = nextPhysicalCount - prevPhysicalCount;

      if (delta <= 0) {
        return false;
      }

      [].push.apply(this._physicalItems, this._createPool(delta));
      [].push.apply(this._physicalSizes, new Array(delta));

      this._physicalCount = prevPhysicalCount + delta;

      return true;
    },

    /**
     * Render a new list of items. This method does exactly the same as `update`,
     * but it also ensures that only one `update` cycle is created.
     */
    _render: function() {
      var requiresUpdate = this._virtualCount > 0 || this._physicalCount > 0;

      if (this.isAttached && !this._itemsRendered && this._isVisible && requiresUpdate)  {
        this._update();
        this._itemsRendered = true;
      }
    },

    /**
     * Templetizes the user template.
     */
    _ensureTemplatized: function() {
      if (!this.ctor) {
        // Template instance props that should be excluded from forwarding
        var props = {};

        props.__key__ = true;
        props[this.as] = true;
        props[this.indexAs] = true;
        props[this.selectedAs] = true;

        this._instanceProps = props;
        this._userTemplate = Polymer.dom(this).querySelector('template');

        if (this._userTemplate) {
          this.templatize(this._userTemplate);
        } else {
          console.warn('iron-list requires a template to be provided in light-dom');
        }
      }
    },

    /**
     * Implements extension point from Templatizer mixin.
     */
    _getStampedChildren: function() {
      return this._physicalItems;
    },

    /**
     * Implements extension point from Templatizer
     * Called as a side effect of a template instance path change, responsible
     * for notifying items.<key-for-instance>.<path> change up to host.
     */
    _forwardInstancePath: function(inst, path, value) {
      if (path.indexOf(this.as + '.') === 0) {
        this.notifyPath('items.' + inst.__key__ + '.' +
          path.slice(this.as.length + 1), value);
      }
    },

    /**
     * Implements extension point from Templatizer mixin
     * Called as side-effect of a host property change, responsible for
     * notifying parent path change on each row.
     */
    _forwardParentProp: function(prop, value) {
      if (this._physicalItems) {
        this._physicalItems.forEach(function(item) {
          item._templateInstance[prop] = value;
        }, this);
      }
    },

    /**
     * Implements extension point from Templatizer
     * Called as side-effect of a host path change, responsible for
     * notifying parent.<path> path change on each row.
     */
    _forwardParentPath: function(path, value) {
      if (this._physicalItems) {
        this._physicalItems.forEach(function(item) {
          item._templateInstance.notifyPath(path, value, true);
        }, this);
      }
    },

    /**
     * Called as a side effect of a host items.<key>.<path> path change,
     * responsible for notifying item.<path> changes to row for key.
     */
    _forwardItemPath: function(path, value) {
      if (this._physicalIndexForKey) {
        var dot = path.indexOf('.');
        var key = path.substring(0, dot < 0 ? path.length : dot);
        var idx = this._physicalIndexForKey[key];
        var row = this._physicalItems[idx];
        if (row) {
          var inst = row._templateInstance;
          if (dot >= 0) {
            path = this.as + '.' + path.substring(dot+1);
            inst.notifyPath(path, value, true);
          } else {
            inst[this.as] = value;
          }
        }
      }
    },

    /**
     * Called when the items have changed. That is, ressignments
     * to `items`, splices or updates to a single item.
     */
    _itemsChanged: function(change) {
      if (change.path === 'items') {
        // render the new set
        this._itemsRendered = false;

        // update the whole set
        this._virtualStartVal = 0;
        this._physicalTop = 0;
        this._virtualCount = this.items ? this.items.length : 0;
        this._collection = this.items ? Polymer.Collection.get(this.items) : null;
        this._physicalIndexForKey = {};

        // scroll to the top
        this._resetScrollPosition(0);

        // create the initial physical items
        if (!this._physicalItems) {
          this._physicalCount = Math.max(1, Math.min(DEFAULT_PHYSICAL_COUNT, this._virtualCount));
          this._physicalItems = this._createPool(this._physicalCount);
          this._physicalSizes = new Array(this._physicalCount);
        }

        this.debounce('refresh', this._render);

      } else if (change.path === 'items.splices') {
        // render the new set
        this._itemsRendered = false;

        this._adjustVirtualIndex(change.value.indexSplices);
        this._virtualCount = this.items ? this.items.length : 0;

        this.debounce('refresh', this._render);

      } else {
        // update a single item
        this._forwardItemPath(change.path.split('.').slice(1).join('.'), change.value);
      }
    },

    /**
     * @param {!Array<!PolymerSplice>} splices
     */
    _adjustVirtualIndex: function(splices) {
      var i, splice, idx;

      for (i = 0; i < splices.length; i++) {
        splice = splices[i];

        // deselect removed items
        splice.removed.forEach(this.$.selector.deselect, this.$.selector);

        idx = splice.index;
        // We only need to care about changes happening above the current position
        if (idx >= this._virtualStartVal) {
          break;
        }

        this._virtualStart = this._virtualStart +
            Math.max(splice.addedCount - splice.removed.length, idx - this._virtualStartVal);
      }
    },

    _scrollHandler: function() {
      this._refresh();
    },

    /**
     * Executes a provided function per every physical index in `itemSet`
     * `itemSet` default value is equivalent to the entire set of physical indexes.
     *
     * @param {!function(number, number)} fn
     * @param {!Array<number>=} itemSet
     */
    _iterateItems: function(fn, itemSet) {
      var pidx, vidx, rtn, i;

      if (arguments.length === 2 && itemSet) {
        for (i = 0; i < itemSet.length; i++) {
          pidx = itemSet[i];
          if (pidx >= this._physicalStart) {
            vidx = this._virtualStartVal + (pidx - this._physicalStart);
          } else {
            vidx = this._virtualStartVal + (this._physicalCount - this._physicalStart) + pidx;
          }
          if ((rtn = fn.call(this, pidx, vidx)) != null) {
            return rtn;
          }
        }
      } else {
        pidx = this._physicalStart;
        vidx = this._virtualStartVal;

        for (; pidx < this._physicalCount; pidx++, vidx++) {
          if ((rtn = fn.call(this, pidx, vidx)) != null) {
            return rtn;
          }
        }

        pidx = 0;

        for (; pidx < this._physicalStart; pidx++, vidx++) {
          if ((rtn = fn.call(this, pidx, vidx)) != null) {
            return rtn;
          }
        }
      }
    },

    /**
     * Assigns the data models to a given set of items.
     * @param {!Array<number>=} itemSet
     */
    _assignModels: function(itemSet) {
      this._iterateItems(function(pidx, vidx) {
        var el = this._physicalItems[pidx];
        var inst = el._templateInstance;
        var item = this.items && this.items[vidx];

        if (item) {
          inst[this.as] = item;
          inst.__key__ = this._collection.getKey(item);
          inst[this.selectedAs] =
            /** @type {!ArraySelectorElement} */ (this.$.selector).isSelected(item);
          inst[this.indexAs] = vidx;
          el.removeAttribute('hidden');
          this._physicalIndexForKey[inst.__key__] = pidx;
        } else {
          inst.__key__ = null;
          el.setAttribute('hidden', '');
        }

      }, itemSet);
    },

    /**
     * Updates the height for a given set of items.
     *
     * @param {!Array<number>=} itemSet
     */
     _updateMetrics: function(itemSet) {
      var newPhysicalSize = 0;
      var oldPhysicalSize = 0;
      var prevAvgCount = this._physicalAverageCount;
      var prevPhysicalAvg = this._physicalAverage;
      // Make sure we distributed all the physical items
      // so we can measure them
      Polymer.dom.flush();

      this._iterateItems(function(pidx, vidx) {
        oldPhysicalSize += this._physicalSizes[pidx] || 0;
        this._physicalSizes[pidx] = this._physicalItems[pidx].offsetHeight;
        newPhysicalSize += this._physicalSizes[pidx];
        this._physicalAverageCount += this._physicalSizes[pidx] ? 1 : 0;
      }, itemSet);

      this._physicalSize = this._physicalSize + newPhysicalSize - oldPhysicalSize;
      this._viewportSize = this._scroller.offsetHeight;

      // update the average if we measured something
      if (this._physicalAverageCount !== prevAvgCount) {
        this._physicalAverage = Math.round(
            ((prevPhysicalAvg * prevAvgCount) + newPhysicalSize) /
            this._physicalAverageCount);
      }
    },

    /**
     * Updates the position of the physical items.
     */
    _positionItems: function() {
      this._adjustScrollPosition();

      var y = this._physicalTop;

      this._iterateItems(function(pidx) {

        this.transform('translate3d(0, ' + y + 'px, 0)', this._physicalItems[pidx]);
        y += this._physicalSizes[pidx];

      });
    },

    /**
     * Adjusts the scroll position when it was overestimated.
     */
    _adjustScrollPosition: function() {
      var deltaHeight = this._virtualStartVal === 0 ? this._physicalTop :
          Math.min(this._scrollPosition + this._physicalTop, 0);

      if (deltaHeight) {
        this._physicalTop = this._physicalTop - deltaHeight;

        // juking scroll position during interial scrolling on iOS is no bueno
        if (!IOS_TOUCH_SCROLLING) {
          this._resetScrollPosition(this._scroller.scrollTop - deltaHeight);
        }
      }
    },

    /**
     * Sets the position of the scroll.
     */
    _resetScrollPosition: function(pos) {
      if (this._scroller) {
        this._scroller.scrollTop = pos;
        this._scrollPosition = this._scroller.scrollTop;
      }
    },

    /**
     * Sets the scroll height, that's the height of the content,
     *
     * @param {boolean=} forceUpdate If true, updates the height no matter what.
     */
    _updateScrollerSize: function(forceUpdate) {
      this._estScrollHeight = (this._physicalBottom +
          Math.max(this._virtualCount - this._physicalCount - this._virtualStartVal, 0) * this._physicalAverage);

      forceUpdate = forceUpdate || this._scrollHeight === 0;
      forceUpdate = forceUpdate || this._scrollPosition >= this._estScrollHeight - this._physicalSize;

      // amortize height adjustment, so it won't trigger repaints very often
      if (forceUpdate || Math.abs(this._estScrollHeight - this._scrollHeight) >= this._optPhysicalSize) {
        this.$.items.style.height = this._estScrollHeight + 'px';
        this._scrollHeight = this._estScrollHeight;
      }
    },

    /**
     * Scroll to a specific item in the virtual list regardless
     * of the physical items in the DOM tree.
     *
     * @method scrollToIndex
     * @param {number} idx The index of the item
     */
    scrollToIndex: function(idx) {
      if (typeof idx !== 'number') {
        return;
      }

      var firstVisible = this.firstVisibleIndex;

      idx = Math.min(Math.max(idx, 0), this._virtualCount-1);

      // start at the previous virtual item
      // so we have a item above the first visible item
      this._virtualStart = idx - 1;

      // assign new models
      this._assignModels();

      // measure the new sizes
      this._updateMetrics();

      // estimate new physical offset
      this._physicalTop = this._virtualStart * this._physicalAverage;

      var currentTopItem = this._physicalStart;
      var currentVirtualItem = this._virtualStart;
      var targetOffsetTop = 0;
      var hiddenContentSize = this._hiddenContentSize;

      // scroll to the item as much as we can
      while (currentVirtualItem !== idx && targetOffsetTop < hiddenContentSize) {
        targetOffsetTop = targetOffsetTop + this._physicalSizes[currentTopItem];
        currentTopItem = (currentTopItem + 1) % this._physicalCount;
        currentVirtualItem++;
      }

      // update the scroller size
      this._updateScrollerSize(true);

      // update the position of the items
      this._positionItems();

      // set the new scroll position
      this._resetScrollPosition(this._physicalTop + targetOffsetTop + 1);

      // increase the pool of physical items if needed
      if (this._increasePoolIfNeeded()) {
        // yield set models to the new items
        this.async(this._update);
      }
      // clear cached visible index
      this._firstVisibleIndexVal = null;
    },

    /**
     * Reset the physical average and the average count.
     */
    _resetAverage: function() {
      this._physicalAverage = 0;
      this._physicalAverageCount = 0;
    },

    /**
     * A handler for the `iron-resize` event triggered by `IronResizableBehavior`
     * when the element is resized.
     */
    _resizeHandler: function() {
      this.debounce('resize', function() {
        this._render();
        if (this._itemsRendered && this._physicalItems && this._isVisible) {
          this._resetAverage();
          this.updateViewportBoundaries();
          this.scrollToIndex(this.firstVisibleIndex);
        }
      });
    },

    _getModelFromItem: function(item) {
      var key = this._collection.getKey(item);
      var pidx = this._physicalIndexForKey[key];

      if (pidx !== undefined) {
        return this._physicalItems[pidx]._templateInstance;
      }
      return null;
    },

    /**
     * Gets a valid item instance from its index or the object value.
     *
     * @param {(Object|number)} item The item object or its index
     */
    _getNormalizedItem: function(item) {
      if (typeof item === 'number') {
        item = this.items[item];
        if (!item) {
          throw new RangeError('<item> not found');
        }
      } else if (this._collection.getKey(item) === undefined) {
        throw new TypeError('<item> should be a valid item');
      }
      return item;
    },

    /**
     * Select the list item at the given index.
     *
     * @method selectItem
     * @param {(Object|number)} item The item object or its index
     */
    selectItem: function(item) {
      item = this._getNormalizedItem(item);
      var model = this._getModelFromItem(item);

      if (!this.multiSelection && this.selectedItem) {
        this.deselectItem(this.selectedItem);
      }
      if (model) {
        model[this.selectedAs] = true;
      }
      this.$.selector.select(item);
    },

    /**
     * Deselects the given item list if it is already selected.
     *

     * @method deselect
     * @param {(Object|number)} item The item object or its index
     */
    deselectItem: function(item) {
      item = this._getNormalizedItem(item);
      var model = this._getModelFromItem(item);

      if (model) {
        model[this.selectedAs] = false;
      }
      this.$.selector.deselect(item);
    },

    /**
     * Select or deselect a given item depending on whether the item
     * has already been selected.
     *
     * @method toggleSelectionForItem
     * @param {(Object|number)} item The item object or its index
     */
    toggleSelectionForItem: function(item) {
      item = this._getNormalizedItem(item);
      if (/** @type {!ArraySelectorElement} */ (this.$.selector).isSelected(item)) {
        this.deselectItem(item);
      } else {
        this.selectItem(item);
      }
    },

    /**
     * Clears the current selection state of the list.
     *
     * @method clearSelection
     */
    clearSelection: function() {
      function unselect(item) {
        var model = this._getModelFromItem(item);
        if (model) {
          model[this.selectedAs] = false;
        }
      }

      if (Array.isArray(this.selectedItems)) {
        this.selectedItems.forEach(unselect, this);
      } else if (this.selectedItem) {
        unselect.call(this, this.selectedItem);
      }

      /** @type {!ArraySelectorElement} */ (this.$.selector).clearSelection();
    },

    /**
     * Add an event listener to `tap` if `selectionEnabled` is true,
     * it will remove the listener otherwise.
     */
    _selectionEnabledChanged: function(selectionEnabled) {
      if (selectionEnabled) {
        this.listen(this, 'tap', '_selectionHandler');
        this.listen(this, 'keypress', '_selectionHandler');
      } else {
        this.unlisten(this, 'tap', '_selectionHandler');
        this.unlisten(this, 'keypress', '_selectionHandler');
      }
    },

    /**
     * Select an item from an event object.
     */
    _selectionHandler: function(e) {
      if (e.type !== 'keypress' || e.keyCode === 13) {
        var model = this.modelForElement(e.target);
        if (model) {
          this.toggleSelectionForItem(model[this.as]);
        }
      }
    },

    _multiSelectionChanged: function(multiSelection) {
      this.clearSelection();
      this.$.selector.multi = multiSelection;
    },

    /**
     * Updates the size of an item.
     *
     * @method updateSizeForItem
     * @param {(Object|number)} item The item object or its index
     */
    updateSizeForItem: function(item) {
      item = this._getNormalizedItem(item);
      var key = this._collection.getKey(item);
      var pidx = this._physicalIndexForKey[key];

      if (pidx !== undefined) {
        this._updateMetrics([pidx]);
        this._positionItems();
      }
    }
  });

})();
Polymer({

    is: 'iron-image',

    properties: {
      /**
       * The URL of an image.
       */
      src: {
        observer: '_srcChanged',
        type: String,
        value: ''
      },

      /**
       * When true, the image is prevented from loading and any placeholder is
       * shown.  This may be useful when a binding to the src property is known to
       * be invalid, to prevent 404 requests.
       */
      preventLoad: {
        type: Boolean,
        value: false
      },

      /**
       * Sets a sizing option for the image.  Valid values are `contain` (full
       * aspect ratio of the image is contained within the element and
       * letterboxed) or `cover` (image is cropped in order to fully cover the
       * bounds of the element), or `null` (default: image takes natural size).
       */
      sizing: {
        type: String,
        value: null
      },

      /**
       * When a sizing option is used (`cover` or `contain`), this determines
       * how the image is aligned within the element bounds.
       */
      position: {
        type: String,
        value: 'center'
      },

      /**
       * When `true`, any change to the `src` property will cause the `placeholder`
       * image to be shown until the new image has loaded.
       */
      preload: {
        type: Boolean,
        value: false
      },

      /**
       * This image will be used as a background/placeholder until the src image has
       * loaded.  Use of a data-URI for placeholder is encouraged for instant rendering.
       */
      placeholder: {
        type: String,
        value: null
      },

      /**
       * When `preload` is true, setting `fade` to true will cause the image to
       * fade into place.
       */
      fade: {
        type: Boolean,
        value: false
      },

      /**
       * Read-only value that is true when the image is loaded.
       */
      loaded: {
        notify: true,
        type: Boolean,
        value: false
      },

      /**
       * Read-only value that tracks the loading state of the image when the `preload`
       * option is used.
       */
      loading: {
        notify: true,
        type: Boolean,
        value: false
      },

      /**
       * Can be used to set the width of image (e.g. via binding); size may also be
       * set via CSS.
       */
      width: {
        observer: '_widthChanged',
        type: Number,
        value: null
      },

      /**
       * Can be used to set the height of image (e.g. via binding); size may also be
       * set via CSS.
       *
       * @attribute height
       * @type number
       * @default null
       */
      height: {
        observer: '_heightChanged',
        type: Number,
        value: null
      },

      _placeholderBackgroundUrl: {
        type: String,
        computed: '_computePlaceholderBackgroundUrl(preload,placeholder)',
        observer: '_placeholderBackgroundUrlChanged'
      },

      requiresPreload: {
        type: Boolean,
        computed: '_computeRequiresPreload(preload,loaded)'
      },

      canLoad: {
        type: Boolean,
        computed: '_computeCanLoad(preventLoad, src)'
      }

    },

    observers: [
      '_transformChanged(sizing, position)',
      '_loadBehaviorChanged(canLoad, preload, loaded)',
      '_loadStateChanged(src, preload, loaded)',
    ],

    ready: function() {
      if (!this.hasAttribute('role')) {
        this.setAttribute('role', 'img');
      }
    },

    _computeImageVisibility: function() {
      return !!this.sizing;
    },

    _computePlaceholderVisibility: function() {
      return !this.preload || (this.loaded && !this.fade);
    },

    _computePlaceholderClassName: function() {
      if (!this.preload) {
        return '';
      }

      if (this.loaded && this.fade) {
        return 'faded-out';
      }

      return '';
    },

    _computePlaceholderBackgroundUrl: function() {
      if (this.preload && this.placeholder) {
        return 'url(' + this.placeholder + ')';
      }

      return null;
    },

    _computeRequiresPreload: function() {
      return this.preload && !this.loaded;
    },

    _computeCanLoad: function() {
      return Boolean(!this.preventLoad && this.src);
    },

    _widthChanged: function() {
      this.style.width = isNaN(this.width) ? this.width : this.width + 'px';
    },

    _heightChanged: function() {
      this.style.height = isNaN(this.height) ? this.height : this.height + 'px';
    },

    _srcChanged: function(newSrc, oldSrc) {
      if (newSrc !== oldSrc) {
        this.loaded = false;
      }
    },

    _placeholderBackgroundUrlChanged: function() {
      this.$.placeholder.style.backgroundImage =
        this._placeholderBackgroundUrl;
    },

    _transformChanged: function() {
      var placeholderStyle = this.$.placeholder.style;

      this.style.backgroundSize =
        placeholderStyle.backgroundSize = this.sizing;

      this.style.backgroundPosition =
        placeholderStyle.backgroundPosition =
        this.sizing ? this.position : '';

      this.style.backgroundRepeat =
        placeholderStyle.backgroundRepeat =
        this.sizing ? 'no-repeat' : '';
    },

    _loadBehaviorChanged: function() {
      var img;

      if (!this.canLoad) {
        return;
      }

      if (this.requiresPreload) {
        img = new Image();
        img.src = this.src;

        this.loading = true;

        img.onload = function() {
          this.loading = false;
          this.loaded = true;
        }.bind(this);
      } else {
        this.loaded = true;
      }
    },

    _loadStateChanged: function() {
      if (this.requiresPreload) {
        return;
      }

      if (this.sizing) {
        this.style.backgroundImage = this.src ? 'url(' + this.src + ')': '';
      } else {
        this.$.img.src = this.src || '';
      }
    }
  });
Polymer({
    is: 'iron-localstorage',

    properties: {
      /**
       * localStorage item key
       */
      name: {
        type: String,
        value: ''
      },
      /**
       * The data associated with this storage.
       * If set to null item will be deleted.
       * @type {*}
       */
      value: {
        type: Object,
        notify: true
      },

      /**
       * If true: do not convert value to JSON on save/load
       */
      useRaw: {
        type: Boolean,
        value: false
      },

      /**
       * Value will not be saved automatically if true. You'll have to do it manually with `save()`
       */
      autoSaveDisabled: {
        type: Boolean,
        value: false
      },
      /**
       * Last error encountered while saving/loading items
       */
      errorMessage: {
        type: String,
        notify: true
      },

      /** True if value has been loaded */
      _loaded: {
        type: Boolean,
        value: false
      }
    },

    observers: [
      '_debounceReload(name,useRaw)',
      '_trySaveValue(autoSaveDisabled)',
      '_trySaveValue(value.*)'
    ],

    ready: function() {
      this._boundHandleStorage = this._handleStorage.bind(this);
    },

    attached: function() {
      window.addEventListener('storage', this._boundHandleStorage);
    },

    detached: function() {
      window.removeEventListener('storage', this._boundHandleStorage);
    },

    _handleStorage: function(ev) {
      if (ev.key == this.name) {
        this._load(true);
      }
    },

    _trySaveValue: function() {
      if (this._doNotSave) {
        return;
      }
      if (this._loaded && !this.autoSaveDisabled) {
        this.debounce('save', this.save);
      }
    },

    _debounceReload: function() {
      this.debounce('reload', this.reload);
    },

    /**
     * Loads the value again. Use if you modify
     * localStorage using DOM calls, and want to
     * keep this element in sync.
     */
    reload: function() {
      this._loaded = false;
      this._load();
    },

    /**
     * loads value from local storage
     * @param {boolean=} externalChange true if loading changes from a different window
     */
    _load: function(externalChange) {
      var v = window.localStorage.getItem(this.name);

      if (v === null) {
        this._loaded = true;
        this._doNotSave = true;  // guard for save watchers
        this.value = null;
        this._doNotSave = false;
        this.fire('iron-localstorage-load-empty', { externalChange: externalChange});
      } else {
        if (!this.useRaw) {
          try { // parse value as JSON
            v = JSON.parse(v);
          } catch(x) {
            this.errorMessage = "Could not parse local storage value";
            console.error("could not parse local storage value", v);
            v = null;
          }
        }
        this._loaded = true;
        this._doNotSave = true;
        this.value = v;
        this._doNotSave = false;
        this.fire('iron-localstorage-load', { externalChange: externalChange});
      }
    },

    /**
     * Saves the value to localStorage. Call to save if autoSaveDisabled is set.
     * If `value` is null, deletes localStorage.
     */
    save: function() {
      var v = this.useRaw ? this.value : JSON.stringify(this.value);
      try {
        if (this.value === null) {
          window.localStorage.removeItem(this.name);
        } else {
          window.localStorage.setItem(this.name, /** @type {string} */ (v));
        }
      }
      catch(ex) {
        // Happens in Safari incognito mode,
        this.errorMessage = ex.message;
        console.error("localStorage could not be saved. Safari incoginito mode?", ex);
      }
    }

    /**
     * Fired when value loads from localStorage.
     *
     * @event iron-localstorage-load
     * @param {{externalChange:boolean}} detail -
     *     externalChange: true if change occured in different window.
     */

    /**
     * Fired when loaded value does not exist.
     * Event handler can be used to initialize default value.
     *
     * @event iron-localstorage-load-empty
     * @param {{externalChange:boolean}} detail -
     *     externalChange: true if change occured in different window.
     */
  });
Polymer({

    is: 'iron-pages',

    behaviors: [
      Polymer.IronResizableBehavior,
      Polymer.IronSelectableBehavior
    ],

    properties: {

      // as the selected page is the only one visible, activateEvent
      // is both non-sensical and problematic; e.g. in cases where a user
      // handler attempts to change the page and the activateEvent
      // handler immediately changes it back
      activateEvent: {
        type: String,
        value: null
      }

    },

    observers: [
      '_selectedPageChanged(selected)'
    ],

    _selectedPageChanged: function(selected, old) {
      this.async(this.notifyResize);
    }
  });
Polymer({

    is: 'neon-animatable',

    behaviors: [
      Polymer.NeonAnimatableBehavior,
      Polymer.IronResizableBehavior
    ]

  });
(function() {

  Polymer({

    is: 'neon-animated-pages',

    behaviors: [
      Polymer.IronResizableBehavior,
      Polymer.IronSelectableBehavior,
      Polymer.NeonAnimationRunnerBehavior
    ],

    properties: {

      activateEvent: {
        type: String,
        value: ''
      },

      // if true, the initial page selection will also be animated according to its animation config.
      animateInitialSelection: {
        type: Boolean,
        value: false
      }

    },

    observers: [
      '_selectedChanged(selected)'
    ],

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _selectedChanged: function(selected) {

      var selectedPage = this.selectedItem;
      var oldPage = this._valueToItem(this._prevSelected) || false;
      this._prevSelected = selected;

      // on initial load and if animateInitialSelection is negated, simply display selectedPage.
      if (!oldPage && !this.animateInitialSelection) {
        this._completeSelectedChanged();
        return;
      }

      // insert safari fix.
      this.animationConfig = [{
        name: 'opaque-animation',
        node: selectedPage
      }];

      // configure selectedPage animations.
      if (this.entryAnimation) {
        this.animationConfig.push({
          name: this.entryAnimation,
          node: selectedPage
        });
      } else {
        if (selectedPage.getAnimationConfig) {
          this.animationConfig.push({
            animatable: selectedPage,
            type: 'entry'
          });
        }
      }

      // configure oldPage animations iff exists.
      if (oldPage) {

        // cancel the currently running animation if one is ongoing.
        if (oldPage.classList.contains('neon-animating')) {
          this._squelchNextFinishEvent = true;
          this.cancelAnimation();
          this._completeSelectedChanged();
          this._squelchNextFinishEvent = false;
        }

        // configure the animation.
        if (this.exitAnimation) {
          this.animationConfig.push({
            name: this.exitAnimation,
            node: oldPage
          });
        } else {
          if (oldPage.getAnimationConfig) {
            this.animationConfig.push({
              animatable: oldPage,
              type: 'exit'
            });
          }
        }

        // display the oldPage during the transition.
        oldPage.classList.add('neon-animating');
      }

      // display the selectedPage during the transition.
      selectedPage.classList.add('neon-animating');

      // actually run the animations.
      if (this.animationConfig.length > 1) {

        // on first load, ensure we run animations only after element is attached.
        if (!this.isAttached) {
          this.async(function () {
            this.playAnimation(undefined, {
              fromPage: null,
              toPage: selectedPage
            });
          });

        } else {
          this.playAnimation(undefined, {
            fromPage: oldPage,
            toPage: selectedPage
          });
        }

      } else {
        this._completeSelectedChanged(oldPage, selectedPage);
      }
    },

    /**
     * @param {Object=} oldPage
     * @param {Object=} selectedPage
     */
    _completeSelectedChanged: function(oldPage, selectedPage) {
      if (selectedPage) {
        selectedPage.classList.remove('neon-animating');
      }
      if (oldPage) {
        oldPage.classList.remove('neon-animating');
      }
      if (!selectedPage || !oldPage) {
        var nodes = Polymer.dom(this.$.content).getDistributedNodes();
        for (var node, index = 0; node = nodes[index]; index++) {
          node.classList && node.classList.remove('neon-animating');
        }
      }
      this.async(this._notifyPageResize);
    },

    _onNeonAnimationFinish: function(event) {
      if (this._squelchNextFinishEvent) {
        this._squelchNextFinishEvent = false;
        return;
      }
      this._completeSelectedChanged(event.detail.fromPage, event.detail.toPage);
    },

    _notifyPageResize: function() {
      var selectedPage = this.selectedItem;
      this.resizerShouldNotify = function(element) {
        return element == selectedPage;
      }
      this.notifyResize();
    }

  })

})();
Polymer({
      is: 'paper-badge',

      hostAttributes: {
        tabindex: '0',
        role: 'status'
      },

      behaviors: [
        Polymer.IronResizableBehavior
      ],

      listeners: {
        'iron-resize': 'updatePosition'
      },

      properties: {
        /**
         * The id of the element that the badge is anchored to. This element
         * must be a sibling of the badge.
         */
        for: {
          type: String,
          observer: '_forChanged'
        },

        /**
         * The label displayed in the badge. The label is centered, and ideally
         * should have very few characters.
         */
        label: {
          type: String,
          observer: '_labelChanged'
        }
      },

      attached: function() {
        this._updateTarget();
      },

      _forChanged: function() {
        // The first time the property is set is before the badge is attached,
        // which means we're not ready to position it yet.
        if (!this.isAttached) {
          return;
        }
        this._updateTarget();
      },

      _labelChanged: function() {
        this.setAttribute('aria-label', this.label);
      },

      _updateTarget: function() {
        this._target = this.target;
        this.async(this.notifyResize, 1);
      },

      /**
       * Returns the target element that this badge is anchored to. It is
       * either the element given by the `for` attribute, or the immediate parent
       * of the badge.
       */
      get target () {
        var parentNode = Polymer.dom(this).parentNode;
        // If the parentNode is a document fragment, then we need to use the host.
        var ownerRoot = Polymer.dom(this).getOwnerRoot();
        var target;

        if (this.for) {
          target = Polymer.dom(ownerRoot).querySelector('#' + this.for);
        } else {
          target = parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE ?
              ownerRoot.host : parentNode;
        }

        return target;
      },

      /**
       * Repositions the badge relative to its anchor element. This is called
       * automatically when the badge is attached or an `iron-resize` event is
       * fired (for exmaple if the window has resized, or your target is a
       * custom element that implements IronResizableBehavior).
       *
       * You should call this in all other cases when the achor's position
       * might have changed (for example, if it's visibility has changed, or
       * you've manually done a page re-layout).
       */
      updatePosition: function() {
        if (!this._target)
          return;

        if (!this.offsetParent)
          return;

        var parentRect = this.offsetParent.getBoundingClientRect();
        var targetRect = this._target.getBoundingClientRect();
        var thisRect = this.getBoundingClientRect();

        this.style.left = targetRect.left - parentRect.left +
            (targetRect.width - thisRect.width / 2) + 'px';
        this.style.top = targetRect.top - parentRect.top -
            (thisRect.height / 2) + 'px';
      }
    });
Polymer({

    is: 'paper-card',

    properties: {

      /**
       * The title of the card.
       */
      heading: {
        type: String,
        value: '',
        observer: '_headingChanged'
      },

      /**
       * The url of the title image of the card.
       */
      image: {
        type: String,
        value: ''
      },

      /**
       * The z-depth of the card, from 0-5.
       */
      elevation: {
        type: Number,
        value: 1,
        reflectToAttribute: true
      },

      /**
       * Set this to true to animate the card shadow when setting a new
       * `z` value.
       */
      animatedShadow: {
        type: Boolean,
        value: false
      },

      /**
       * Read-only property used to pass down the `animatedShadow` value to
       * the underlying paper-material style (since they have different names).
       */
      animated: {
        type: Boolean,
        reflectToAttribute: true,
        readOnly: true,
        computed: '_computeAnimated(animatedShadow)'
      }
    },

    _headingChanged: function(heading) {
      var label = this.getAttribute('aria-label');
      this.setAttribute('aria-label', heading);
    },

    _computeHeadingClass: function(image) {
      var cls = 'title-text';
      if (image)
        cls += ' over-image';
      return cls;
    },

    _computeAnimated: function(animatedShadow) {
      return animatedShadow;
    }
  });
Polymer({
      is: 'paper-checkbox',

      behaviors: [
        Polymer.PaperCheckedElementBehavior
      ],

      hostAttributes: {
        role: 'checkbox',
        'aria-checked': false,
        tabindex: 0
      },

      properties: {
        /**
         * Fired when the checked state changes due to user interaction.
         *
         * @event change
         */

        /**
         * Fired when the checked state changes.
         *
         * @event iron-change
         */
        ariaActiveAttribute: {
          type: String,
          value: 'aria-checked'
        }
      },

      _computeCheckboxClass: function(checked, invalid) {
        var className = '';
        if (checked) {
          className += 'checked ';
        }
        if (invalid) {
          className += 'invalid';
        }
        return className;
      },

      _computeCheckmarkClass: function(checked) {
        return checked ? '' : 'hidden';
      },

      // create ripple inside the checkboxContainer
      _createRipple: function() {
        this._rippleContainer = this.$.checkboxContainer;
        return Polymer.PaperInkyFocusBehaviorImpl._createRipple.call(this);
      }

    });
(function() {

  Polymer({

    is: 'paper-dialog',

    behaviors: [
      Polymer.PaperDialogBehavior,
      Polymer.NeonAnimationRunnerBehavior
    ],

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _renderOpened: function() {
      if (this.withBackdrop) {
        this.backdropElement.open();
      }
      this.playAnimation('entry');
    },

    _renderClosed: function() {
      if (this.withBackdrop) {
        this.backdropElement.close();
      }
      this.playAnimation('exit');
    },

    _onNeonAnimationFinish: function() {
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    }

  });

})();
(function() {

  Polymer({

    is: 'paper-dialog-scrollable',

    properties: {

      /**
       * The dialog element that implements `Polymer.PaperDialogBehavior` containing this element.
       * @type {?Node}
       */
      dialogElement: {
        type: Object,
        value: function() {
          return this.parentNode;
        }
      }

    },

    listeners: {
      'scrollable.scroll': '_onScroll',
      'iron-resize': '_onIronResize'
    },

    /**
     * Returns the scrolling element.
     */
    get scrollTarget() {
      return this.$.scrollable;
    },

    attached: function() {
      this.classList.add('no-padding');
      // Set itself to the overlay sizing target
      this.dialogElement.sizingTarget = this.scrollTarget;
      // If the host is sized, fit the scrollable area to the container. Otherwise let it be
      // its natural size.
      requestAnimationFrame(function() {
        if (this.offsetHeight > 0) {
          this.$.scrollable.classList.add('fit');
        }
        this._scroll();
      }.bind(this));
    },

    _scroll: function() {
      this.toggleClass('is-scrolled', this.scrollTarget.scrollTop > 0);
      this.toggleClass('can-scroll', this.scrollTarget.offsetHeight < this.scrollTarget.scrollHeight);
      this.toggleClass('scrolled-to-bottom',
        this.scrollTarget.scrollTop + this.scrollTarget.offsetHeight >= this.scrollTarget.scrollHeight);
    },

    _onScroll: function() {
      this._scroll();
    }

  })

})();
(function() {
      'use strict';

      // this would be the only `paper-drawer-panel` in
      // the whole app that can be in `dragging` state
      var sharedPanel = null;

      function classNames(obj) {
        var classes = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key) && obj[key]) {
            classes.push(key);
          }
        }

        return classes.join(' ');
      }

      Polymer({

        is: 'paper-drawer-panel',

        behaviors: [Polymer.IronResizableBehavior],

        /**
         * Fired when the narrow layout changes.
         *
         * @event paper-responsive-change {{narrow: boolean}} detail -
         *     narrow: true if the panel is in narrow layout.
         */

        /**
         * Fired when the a panel is selected.
         *
         * Listening for this event is an alternative to observing changes in the `selected` attribute.
         * This event is fired both when a panel is selected.
         *
         * @event iron-select {{item: Object}} detail -
         *     item: The panel that the event refers to.
         */

        /**
         * Fired when a panel is deselected.
         *
         * Listening for this event is an alternative to observing changes in the `selected` attribute.
         * This event is fired both when a panel is deselected.
         *
         * @event iron-deselect {{item: Object}} detail -
         *     item: The panel that the event refers to.
         */
        properties: {

          /**
           * The panel to be selected when `paper-drawer-panel` changes to narrow
           * layout.
           */
          defaultSelected: {
            type: String,
            value: 'main'
          },

          /**
           * If true, swipe from the edge is disabled.
           */
          disableEdgeSwipe: {
            type: Boolean,
            value: false
          },

          /**
           * If true, swipe to open/close the drawer is disabled.
           */
          disableSwipe: {
            type: Boolean,
            value: false
          },

          /**
           * Whether the user is dragging the drawer interactively.
           */
          dragging: {
            type: Boolean,
            value: false,
            readOnly: true,
            notify: true
          },

          /**
           * Width of the drawer panel.
           */
          drawerWidth: {
            type: String,
            value: '256px'
          },

          /**
           * How many pixels on the side of the screen are sensitive to edge
           * swipes and peek.
           */
          edgeSwipeSensitivity: {
            type: Number,
            value: 30
          },

          /**
           * If true, ignore `responsiveWidth` setting and force the narrow layout.
           */
          forceNarrow: {
            type: Boolean,
            value: false
          },

          /**
           * Whether the browser has support for the transform CSS property.
           */
          hasTransform: {
            type: Boolean,
            value: function() {
              return 'transform' in this.style;
            }
          },

          /**
           * Whether the browser has support for the will-change CSS property.
           */
          hasWillChange: {
            type: Boolean,
            value: function() {
              return 'willChange' in this.style;
            }
          },

          /**
           * Returns true if the panel is in narrow layout.  This is useful if you
           * need to show/hide elements based on the layout.
           */
          narrow: {
            reflectToAttribute: true,
            type: Boolean,
            value: false,
            readOnly: true,
            notify: true
          },

          /**
           * Whether the drawer is peeking out from the edge.
           */
          peeking: {
            type: Boolean,
            value: false,
            readOnly: true,
            notify: true
          },

          /**
           * Max-width when the panel changes to narrow layout.
           */
          responsiveWidth: {
            type: String,
            value: '600px'
          },

          /**
           * If true, position the drawer to the right.
           */
          rightDrawer: {
            type: Boolean,
            value: false
          },

          /**
           * The panel that is being selected. `drawer` for the drawer panel and
           * `main` for the main panel.
           */
          selected: {
            reflectToAttribute: true,
            notify: true,
            type: String,
            value: null
          },

          /**
           * The attribute on elements that should toggle the drawer on tap, also elements will
           * automatically be hidden in wide layout.
           */
          drawerToggleAttribute: {
            type: String,
            value: 'paper-drawer-toggle'
          },

          /**
           * Whether the transition is enabled.
           */
          transition: {
            type: Boolean,
            value: false
          },

        },

        listeners: {
          tap: '_onTap',
          track: '_onTrack',
          down: '_downHandler',
          up: '_upHandler'
        },

        observers: [
          '_forceNarrowChanged(forceNarrow, defaultSelected)'
        ],

        /**
         * Toggles the panel open and closed.
         *
         * @method togglePanel
         */
        togglePanel: function() {
          if (this._isMainSelected()) {
            this.openDrawer();
          } else {
            this.closeDrawer();
          }
        },

        /**
         * Opens the drawer.
         *
         * @method openDrawer
         */
        openDrawer: function() {
          this.selected = 'drawer';
        },

        /**
         * Closes the drawer.
         *
         * @method closeDrawer
         */
        closeDrawer: function() {
          this.selected = 'main';
        },

        ready: function() {
          // Avoid transition at the beginning e.g. page loads and enable
          // transitions only after the element is rendered and ready.
          this.transition = true;
        },

        _onMainTransitionEnd: function (e) {
          if (e.currentTarget === this.$.main && (e.propertyName === 'left' || e.propertyName === 'right')) {
            this.notifyResize();
          }
        },

        _computeIronSelectorClass: function(narrow, transition, dragging, rightDrawer, peeking) {
          return classNames({
            dragging: dragging,
            'narrow-layout': narrow,
            'right-drawer': rightDrawer,
            'left-drawer': !rightDrawer,
            transition: transition,
            peeking: peeking
          });
        },

        _computeDrawerStyle: function(drawerWidth) {
          return 'width:' + drawerWidth + ';';
        },

        _computeMainStyle: function(narrow, rightDrawer, drawerWidth) {
          var style = '';

          style += 'left:' + ((narrow || rightDrawer) ? '0' : drawerWidth) + ';';

          if (rightDrawer) {
            style += 'right:' + (narrow ? '' : drawerWidth) + ';';
          }

          return style;
        },

        _computeMediaQuery: function(forceNarrow, responsiveWidth) {
          return forceNarrow ? '' : '(max-width: ' + responsiveWidth + ')';
        },

        _computeSwipeOverlayHidden: function(narrow, disableEdgeSwipe) {
          return !narrow || disableEdgeSwipe;
        },

        _onTrack: function(event) {
          if (sharedPanel && this !== sharedPanel) {
            return;
          }
          switch (event.detail.state) {
            case 'start':
              this._trackStart(event);
              break;
            case 'track':
              this._trackX(event);
              break;
            case 'end':
              this._trackEnd(event);
              break;
          }

        },

        _responsiveChange: function(narrow) {
          this._setNarrow(narrow);

          if (this.narrow) {
            this.selected = this.defaultSelected;
          }

          this.setScrollDirection(this._swipeAllowed() ? 'y' : 'all');
          this.fire('paper-responsive-change', {narrow: this.narrow});
        },

        _onQueryMatchesChanged: function(event) {
          this._responsiveChange(event.detail.value);
        },

        _forceNarrowChanged: function() {
          // set the narrow mode only if we reached the `responsiveWidth`
          this._responsiveChange(this.forceNarrow || this.$.mq.queryMatches);
        },

        _swipeAllowed: function() {
          return this.narrow && !this.disableSwipe;
        },

        _isMainSelected: function() {
          return this.selected === 'main';
        },

        _startEdgePeek: function() {
          this.width = this.$.drawer.offsetWidth;
          this._moveDrawer(this._translateXForDeltaX(this.rightDrawer ?
              -this.edgeSwipeSensitivity : this.edgeSwipeSensitivity));
          this._setPeeking(true);
        },

        _stopEdgePeek: function() {
          if (this.peeking) {
            this._setPeeking(false);
            this._moveDrawer(null);
          }
        },

        _downHandler: function(event) {
          if (!this.dragging && this._isMainSelected() && this._isEdgeTouch(event) && !sharedPanel) {
            this._startEdgePeek();
            // cancel selection
            event.preventDefault();
            // grab this panel
            sharedPanel = this;
          }
        },

        _upHandler: function() {
          this._stopEdgePeek();
          // release the panel
          sharedPanel = null;
        },

        _onTap: function(event) {
          var targetElement = Polymer.dom(event).localTarget;
          var isTargetToggleElement = targetElement &&
            this.drawerToggleAttribute &&
            targetElement.hasAttribute(this.drawerToggleAttribute);

          if (isTargetToggleElement) {
            this.togglePanel();
          }
        },

        _isEdgeTouch: function(event) {
          var x = event.detail.x;

          return !this.disableEdgeSwipe && this._swipeAllowed() &&
            (this.rightDrawer ?
              x >= this.offsetWidth - this.edgeSwipeSensitivity :
              x <= this.edgeSwipeSensitivity);
        },

        _trackStart: function(event) {
          if (this._swipeAllowed()) {
            sharedPanel = this;
            this._setDragging(true);

            if (this._isMainSelected()) {
              this._setDragging(this.peeking || this._isEdgeTouch(event));
            }

            if (this.dragging) {
              this.width = this.$.drawer.offsetWidth;
              this.transition = false;
            }
          }
        },

        _translateXForDeltaX: function(deltaX) {
          var isMain = this._isMainSelected();

          if (this.rightDrawer) {
            return Math.max(0, isMain ? this.width + deltaX : deltaX);
          } else {
            return Math.min(0, isMain ? deltaX - this.width : deltaX);
          }
        },

        _trackX: function(event) {
          if (this.dragging) {
            var dx = event.detail.dx;

            if (this.peeking) {
              if (Math.abs(dx) <= this.edgeSwipeSensitivity) {
                // Ignore trackx until we move past the edge peek.
                return;
              }
              this._setPeeking(false);
            }

            this._moveDrawer(this._translateXForDeltaX(dx));
          }
        },

        _trackEnd: function(event) {
          if (this.dragging) {
            var xDirection = event.detail.dx > 0;

            this._setDragging(false);
            this.transition = true;
            sharedPanel = null;
            this._moveDrawer(null);

            if (this.rightDrawer) {
              this[xDirection ? 'closeDrawer' : 'openDrawer']();
            } else {
              this[xDirection ? 'openDrawer' : 'closeDrawer']();
            }
          }
        },

        _transformForTranslateX: function(translateX) {
          if (translateX === null) {
            return '';
          }

          return this.hasWillChange ? 'translateX(' + translateX + 'px)' :
              'translate3d(' + translateX + 'px, 0, 0)';
        },

        _moveDrawer: function(translateX) {
          this.transform(this._transformForTranslateX(translateX), this.$.drawer);
        }

      });
    }());
Polymer({
    is: 'paper-input-char-counter',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      _charCounterStr: {
        type: String,
        value: '0'
      }
    },

    update: function(state) {
      if (!state.inputElement) {
        return;
      }

      state.value = state.value || '';

      // Account for the textarea's new lines.
      var str = state.value.replace(/(\r\n|\n|\r)/g, '--').length;

      if (state.inputElement.hasAttribute('maxlength')) {
        str += '/' + state.inputElement.getAttribute('maxlength');
      }
      this._charCounterStr = str;
    }
  });
Polymer({
    is: 'paper-input',

    behaviors: [
      Polymer.IronFormElementBehavior,
      Polymer.PaperInputBehavior,
      Polymer.IronControlState
    ]
  });
(function() {
    'use strict';

    var PaperMenuButton = Polymer({
      is: 'paper-menu-button',

      /**
       * Fired when the dropdown opens.
       *
       * @event paper-dropdown-open
       */

      /**
       * Fired when the dropdown closes.
       *
       * @event paper-dropdown-close
       */

      behaviors: [
        Polymer.IronA11yKeysBehavior,
        Polymer.IronControlState
      ],

      properties: {

        /**
         * True if the content is currently displayed.
         */
        opened: {
          type: Boolean,
          value: false,
          notify: true,
          observer: '_openedChanged'
        },

        /**
         * The orientation against which to align the menu dropdown
         * horizontally relative to the dropdown trigger.
         */
        horizontalAlign: {
          type: String,
          value: 'left',
          reflectToAttribute: true
        },

        /**
         * The orientation against which to align the menu dropdown
         * vertically relative to the dropdown trigger.
         */
        verticalAlign: {
          type: String,
          value: 'top',
          reflectToAttribute: true
        },

        /**
         * A pixel value that will be added to the position calculated for the
         * given `horizontalAlign`. Use a negative value to offset to the
         * left, or a positive value to offset to the right.
         */
        horizontalOffset: {
          type: Number,
          value: 0,
          notify: true
        },

        /**
         * A pixel value that will be added to the position calculated for the
         * given `verticalAlign`. Use a negative value to offset towards the
         * top, or a positive value to offset towards the bottom.
         */
        verticalOffset: {
          type: Number,
          value: 0,
          notify: true
        },

        /**
         * Set to true to disable animations when opening and closing the
         * dropdown.
         */
        noAnimations: {
          type: Boolean,
          value: false
        },

        /**
         * Set to true to disable automatically closing the dropdown after
         * a selection has been made.
         */
        ignoreSelect: {
          type: Boolean,
          value: false
        },

        /**
         * An animation config. If provided, this will be used to animate the
         * opening of the dropdown.
         */
        openAnimationConfig: {
          type: Object,
          value: function() {
            return [{
              name: 'fade-in-animation',
              timing: {
                delay: 100,
                duration: 200
              }
            }, {
              name: 'paper-menu-grow-width-animation',
              timing: {
                delay: 100,
                duration: 150,
                easing: PaperMenuButton.ANIMATION_CUBIC_BEZIER
              }
            }, {
              name: 'paper-menu-grow-height-animation',
              timing: {
                delay: 100,
                duration: 275,
                easing: PaperMenuButton.ANIMATION_CUBIC_BEZIER
              }
            }];
          }
        },

        /**
         * An animation config. If provided, this will be used to animate the
         * closing of the dropdown.
         */
        closeAnimationConfig: {
          type: Object,
          value: function() {
            return [{
              name: 'fade-out-animation',
              timing: {
                duration: 150
              }
            }, {
              name: 'paper-menu-shrink-width-animation',
              timing: {
                delay: 100,
                duration: 50,
                easing: PaperMenuButton.ANIMATION_CUBIC_BEZIER
              }
            }, {
              name: 'paper-menu-shrink-height-animation',
              timing: {
                duration: 200,
                easing: 'ease-in'
              }
            }];
          }
        },

        /**
         * This is the element intended to be bound as the focus target
         * for the `iron-dropdown` contained by `paper-menu-button`.
         */
        _dropdownContent: {
          type: Object
        }
      },

      hostAttributes: {
        role: 'group',
        'aria-haspopup': 'true'
      },

      listeners: {
        'iron-select': '_onIronSelect'
      },

      /**
       * The content element that is contained by the menu button, if any.
       */
      get contentElement() {
        return Polymer.dom(this.$.content).getDistributedNodes()[0];
      },

      /**
       * Make the dropdown content appear as an overlay positioned relative
       * to the dropdown trigger.
       */
      open: function() {
        if (this.disabled) {
          return;
        }

        this.$.dropdown.open();
      },

      /**
       * Hide the dropdown content.
       */
      close: function() {
        this.$.dropdown.close();
      },

      /**
       * When an `iron-select` event is received, the dropdown should
       * automatically close on the assumption that a value has been chosen.
       *
       * @param {CustomEvent} event A CustomEvent instance with type
       * set to `"iron-select"`.
       */
      _onIronSelect: function(event) {
        if (!this.ignoreSelect) {
          this.close();
        }
      },

      /**
       * When the dropdown opens, the `paper-menu-button` fires `paper-open`.
       * When the dropdown closes, the `paper-menu-button` fires `paper-close`.
       *
       * @param {boolean} opened True if the dropdown is opened, otherwise false.
       * @param {boolean} oldOpened The previous value of `opened`.
       */
      _openedChanged: function(opened, oldOpened) {
        if (opened) {
          // TODO(cdata): Update this when we can measure changes in distributed
          // children in an idiomatic way.
          // We poke this property in case the element has changed. This will
          // cause the focus target for the `iron-dropdown` to be updated as
          // necessary:
          this._dropdownContent = this.contentElement;
          this.fire('paper-dropdown-open');
        } else if (oldOpened != null) {
          this.fire('paper-dropdown-close');
        }
      },

      /**
       * If the dropdown is open when disabled becomes true, close the
       * dropdown.
       *
       * @param {boolean} disabled True if disabled, otherwise false.
       */
      _disabledChanged: function(disabled) {
        Polymer.IronControlState._disabledChanged.apply(this, arguments);
        if (disabled && this.opened) {
          this.close();
        }
      }
    });

    PaperMenuButton.ANIMATION_CUBIC_BEZIER = 'cubic-bezier(.3,.95,.5,1)';
    PaperMenuButton.MAX_ANIMATION_TIME_MS = 400;

    Polymer.PaperMenuButton = PaperMenuButton;
  })();
(function() {
    'use strict';

    Polymer({
      is: 'paper-dropdown-menu',

      /**
       * Fired when the dropdown opens.
       *
       * @event paper-dropdown-open
       */

      /**
       * Fired when the dropdown closes.
       *
       * @event paper-dropdown-close
       */

      behaviors: [
        Polymer.IronControlState,
        Polymer.IronButtonState,
        Polymer.IronFormElementBehavior,
        Polymer.IronValidatableBehavior
      ],

      properties: {
        /**
         * The derived "label" of the currently selected item. This value
         * is the `label` property on the selected item if set, or else the
         * trimmed text content of the selected item.
         */
        selectedItemLabel: {
          type: String,
          notify: true,
          readOnly: true
        },

        /**
         * The last selected item. An item is selected if the dropdown menu has
         * a child with class `dropdown-content`, and that child triggers an
         * `iron-select` event with the selected `item` in the `detail`.
         *
         * @type {?Object}
         */
        selectedItem: {
          type: Object,
          notify: true,
          readOnly: true
        },

        /**
         * The value for this element that will be used when submitting in
         * a form. It is read only, and will always have the same value
         * as `selectedItemLabel`.
         */
        value: {
          type: String,
          notify: true,
          readOnly: true
        },

        /**
         * The label for the dropdown.
         */
        label: {
          type: String
        },

        /**
         * The placeholder for the dropdown.
         */
        placeholder: {
          type: String
        },

        /**
         * True if the dropdown is open. Otherwise, false.
         */
        opened: {
          type: Boolean,
          notify: true,
          value: false,
          observer: '_openedChanged'
        },

        /**
         * Set to true to disable the floating label. Bind this to the
         * `<paper-input-container>`'s `noLabelFloat` property.
         */
        noLabelFloat: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
        },

        /**
         * Set to true to always float the label. Bind this to the
         * `<paper-input-container>`'s `alwaysFloatLabel` property.
         */
        alwaysFloatLabel: {
          type: Boolean,
          value: false
        },

        /**
         * Set to true to disable animations when opening and closing the
         * dropdown.
         */
        noAnimations: {
          type: Boolean,
          value: false
        }
      },

      listeners: {
        'tap': '_onTap'
      },

      keyBindings: {
        'up down': 'open',
        'esc': 'close'
      },

      hostAttributes: {
        role: 'combobox',
        'aria-autocomplete': 'none',
        'aria-haspopup': 'true'
      },

      observers: [
        '_selectedItemChanged(selectedItem)'
      ],

      attached: function() {
        // NOTE(cdata): Due to timing, a preselected value in a `IronSelectable`
        // child will cause an `iron-select` event to fire while the element is
        // still in a `DocumentFragment`. This has the effect of causing
        // handlers not to fire. So, we double check this value on attached:
        var contentElement = this.contentElement;
        if (contentElement && contentElement.selectedItem) {
          this._setSelectedItem(contentElement.selectedItem);
        }
      },

      /**
       * The content element that is contained by the dropdown menu, if any.
       */
      get contentElement() {
        return Polymer.dom(this.$.content).getDistributedNodes()[0];
      },

      /**
       * Show the dropdown content.
       */
      open: function() {
        this.$.menuButton.open();
      },

      /**
       * Hide the dropdown content.
       */
      close: function() {
        this.$.menuButton.close();
      },

      /**
       * A handler that is called when `iron-select` is fired.
       *
       * @param {CustomEvent} event An `iron-select` event.
       */
      _onIronSelect: function(event) {
        this._setSelectedItem(event.detail.item);
      },

      /**
       * A handler that is called when `iron-deselect` is fired.
       *
       * @param {CustomEvent} event An `iron-deselect` event.
       */
      _onIronDeselect: function(event) {
        this._setSelectedItem(null);
      },

      /**
       * A handler that is called when the dropdown is tapped.
       *
       * @param {CustomEvent} event A tap event.
       */
      _onTap: function(event) {
        if (Polymer.Gestures.findOriginalTarget(event) === this) {
          this.open();
        }
      },

      /**
       * Compute the label for the dropdown given a selected item.
       *
       * @param {Element} selectedItem A selected Element item, with an
       * optional `label` property.
       */
      _selectedItemChanged: function(selectedItem) {
        var value = '';
        if (!selectedItem) {
          value = '';
        } else {
          value = selectedItem.label || selectedItem.textContent.trim();
        }

        this._setValue(value);
        this._setSelectedItemLabel(value);
      },

      /**
       * Compute the vertical offset of the menu based on the value of
       * `noLabelFloat`.
       *
       * @param {boolean} noLabelFloat True if the label should not float
       * above the input, otherwise false.
       */
      _computeMenuVerticalOffset: function(noLabelFloat) {
        // NOTE(cdata): These numbers are somewhat magical because they are
        // derived from the metrics of elements internal to `paper-input`'s
        // template. The metrics will change depending on whether or not the
        // input has a floating label.
        return noLabelFloat ? -4 : 8;
      },

      /**
       * Returns false if the element is required and does not have a selection,
       * and true otherwise.
       * @return {boolean} true if `required` is false, or if `required` is true
       * and the element has a valid selection.
       */
      _getValidity: function() {
        return this.disabled || !this.required || (this.required && this.value);
      },

      _openedChanged: function() {
        var openState = this.opened ? 'true' : 'false';
        var e = this.contentElement;
        if (e) {
          e.setAttribute('aria-expanded', openState);
        }
      }
    });
  })();
Polymer({
    is: 'paper-fab',

    behaviors: [
      Polymer.PaperButtonBehavior
    ],

    properties: {
      /**
       * The URL of an image for the icon. If the src property is specified,
       * the icon property should not be.
       *
       * @attribute src
       * @type string
       * @default ''
       */
      src: {
        type: String,
        value: ''
      },

      /**
       * Specifies the icon name or index in the set of icons available in
       * the icon's icon set. If the icon property is specified,
       * the src property should not be.
       *
       * @attribute icon
       * @type string
       * @default ''
       */
      icon: {
        type: String,
        value: ''
      },

      /**
       * Set this to true to style this is a "mini" FAB.
       *
       * @attribute mini
       * @type boolean
       * @default false
       */
      mini: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      }
    }
  });
(function() {

    'use strict';

    var SHADOW_WHEN_SCROLLING = 1;
    var SHADOW_ALWAYS = 2;


    var MODE_CONFIGS = {

      outerScroll: {
        'scroll': true
      },

      shadowMode: {
        'standard': SHADOW_ALWAYS,
        'waterfall': SHADOW_WHEN_SCROLLING,
        'waterfall-tall': SHADOW_WHEN_SCROLLING
      },

      tallMode: {
        'waterfall-tall': true
      }
    };

    Polymer({

      is: 'paper-header-panel',

      /**
       * Fired when the content has been scrolled.  `event.detail.target` returns
       * the scrollable element which you can use to access scroll info such as
       * `scrollTop`.
       *
       *     <paper-header-panel on-content-scroll="scrollHandler">
       *       ...
       *     </paper-header-panel>
       *
       *
       *     scrollHandler: function(event) {
       *       var scroller = event.detail.target;
       *       console.log(scroller.scrollTop);
       *     }
       *
       * @event content-scroll
       */

      properties: {

        /**
         * Controls header and scrolling behavior. Options are
         * `standard`, `seamed`, `waterfall`, `waterfall-tall`, `scroll` and
         * `cover`. Default is `standard`.
         *
         * `standard`: The header is a step above the panel. The header will consume the
         * panel at the point of entry, preventing it from passing through to the
         * opposite side.
         *
         * `seamed`: The header is presented as seamed with the panel.
         *
         * `waterfall`: Similar to standard mode, but header is initially presented as
         * seamed with panel, but then separates to form the step.
         *
         * `waterfall-tall`: The header is initially taller (`tall` class is added to
         * the header).  As the user scrolls, the header separates (forming an edge)
         * while condensing (`tall` class is removed from the header).
         *
         * `scroll`: The header keeps its seam with the panel, and is pushed off screen.
         *
         * `cover`: The panel covers the whole `paper-header-panel` including the
         * header. This allows user to style the panel in such a way that the panel is
         * partially covering the header.
         *
         *     <paper-header-panel mode="cover">
         *       <paper-toolbar class="tall">
         *         <core-icon-button icon="menu"></core-icon-button>
         *       </paper-toolbar>
         *       <div class="content"></div>
         *     </paper-header-panel>
         */
        mode: {
          type: String,
          value: 'standard',
          observer: '_modeChanged',
          reflectToAttribute: true
        },

        /**
         * If true, the drop-shadow is always shown no matter what mode is set to.
         */
        shadow: {
          type: Boolean,
          value: false
        },

        /**
         * The class used in waterfall-tall mode.  Change this if the header
         * accepts a different class for toggling height, e.g. "medium-tall"
         */
        tallClass: {
          type: String,
          value: 'tall'
        },

        /**
         * If true, the scroller is at the top
         */
        atTop: {
          type: Boolean,
          value: true,
          readOnly: true
        }
      },

      observers: [
        '_computeDropShadowHidden(atTop, mode, shadow)'
      ],

      ready: function() {
        this.scrollHandler = this._scroll.bind(this);
        this._addListener();

        // Run `scroll` logic once to initialze class names, etc.
        this._keepScrollingState();
      },

      detached: function() {
        this._removeListener();
      },

      /**
       * Returns the header element
       *
       * @property header
       * @type Object
       */
      get header() {
        return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
      },

      /**
       * Returns the scrollable element.
       *
       * @property scroller
       * @type Object
       */
      get scroller() {
        return this._getScrollerForMode(this.mode);
      },

      /**
       * Returns true if the scroller has a visible shadow.
       *
       * @property visibleShadow
       * @type Boolean
       */
      get visibleShadow() {
        return this.$.dropShadow.classList.contains('has-shadow');
      },

      _computeDropShadowHidden: function(atTop, mode, shadow) {

        var shadowMode = MODE_CONFIGS.shadowMode[mode];

        if (this.shadow) {
          this.toggleClass('has-shadow', true, this.$.dropShadow);

        } else if (shadowMode === SHADOW_ALWAYS) {
          this.toggleClass('has-shadow', true, this.$.dropShadow);

        } else if (shadowMode === SHADOW_WHEN_SCROLLING && !atTop) {
          this.toggleClass('has-shadow', true, this.$.dropShadow);

        } else {
          this.toggleClass('has-shadow', false, this.$.dropShadow);

        }
      },

      _computeMainContainerClass: function(mode) {
        // TODO:  It will be useful to have a utility for classes
        // e.g. Polymer.Utils.classes({ foo: true });

        var classes = {};

        classes['flex'] = mode !== 'cover';

        return Object.keys(classes).filter(
          function(className) {
            return classes[className];
          }).join(' ');
      },

      _addListener: function() {
        this.scroller.addEventListener('scroll', this.scrollHandler, false);
      },

      _removeListener: function() {
        this.scroller.removeEventListener('scroll', this.scrollHandler);
      },

      _modeChanged: function(newMode, oldMode) {
        var configs = MODE_CONFIGS;
        var header = this.header;
        var animateDuration = 200;

        if (header) {
          // in tallMode it may add tallClass to the header; so do the cleanup
          // when mode is changed from tallMode to not tallMode
          if (configs.tallMode[oldMode] && !configs.tallMode[newMode]) {
            header.classList.remove(this.tallClass);
            this.async(function() {
              header.classList.remove('animate');
            }, animateDuration);
          } else {
            header.classList.toggle('animate', configs.tallMode[newMode]);
          }
        }
        this._keepScrollingState();
      },

      _keepScrollingState: function() {
        var main = this.scroller;
        var header = this.header;

        this._setAtTop(main.scrollTop === 0);

        if (header && this.tallClass && MODE_CONFIGS.tallMode[this.mode]) {
          this.toggleClass(this.tallClass, this.atTop ||
              header.classList.contains(this.tallClass) &&
              main.scrollHeight < this.offsetHeight, header);
        }
      },

      _scroll: function() {
        this._keepScrollingState();
        this.fire('content-scroll', {target: this.scroller}, {bubbles: false});
      },

      _getScrollerForMode: function(mode) {
        return MODE_CONFIGS.outerScroll[mode] ?
            this : this.$.mainContainer;
      }

    });

  })();
Polymer({
      is: 'paper-icon-button',

      hostAttributes: {
        role: 'button',
        tabindex: '0'
      },

      behaviors: [
        Polymer.PaperInkyFocusBehavior
      ],

      properties: {
        /**
         * The URL of an image for the icon. If the src property is specified,
         * the icon property should not be.
         */
        src: {
          type: String
        },

        /**
         * Specifies the icon name or index in the set of icons available in
         * the icon's icon set. If the icon property is specified,
         * the src property should not be.
         */
        icon: {
          type: String
        },

        /**
         * Specifies the alternate text for the button, for accessibility.
         */
        alt: {
          type: String,
          observer: "_altChanged"
        }
      },

      _altChanged: function(newValue, oldValue) {
        var label = this.getAttribute('aria-label');

        // Don't stomp over a user-set aria-label.
        if (!label || oldValue == label) {
          this.setAttribute('aria-label', newValue);
        }
      }
    });
Polymer({
    is: 'paper-textarea',

    behaviors: [
      Polymer.PaperInputBehavior
    ],

    properties: {
      _ariaLabelledBy: {
        observer: '_ariaLabelledByChanged',
        type: String
      },

      _ariaDescribedBy: {
        observer: '_ariaDescribedByChanged',
        type: String
      },

      /**
       * The initial number of rows.
       *
       * @attribute rows
       * @type number
       * @default 1
       */
      rows: {
        type: Number,
        value: 1
      },

      /**
       * The maximum number of rows this element can grow to until it
       * scrolls. 0 means no maximum.
       *
       * @attribute maxRows
       * @type number
       * @default 0
       */
      maxRows: {
       type: Number,
       value: 0
      }
    },

    _ariaLabelledByChanged: function(ariaLabelledBy) {
      this.$.input.textarea.setAttribute('aria-labelledby', ariaLabelledBy);
    },

    _ariaDescribedByChanged: function(ariaDescribedBy) {
      this.$.input.textarea.setAttribute('aria-describedby', ariaDescribedBy);
    }
  });
Polymer({
      is: 'paper-item',

      hostAttributes: {
        role: 'option',
        tabindex: '0'
      },

      behaviors: [
        Polymer.IronControlState,
        Polymer.IronButtonState
      ]
    });
Polymer({
      is: 'paper-icon-item',

      hostAttributes: {
        'role': 'option',
        'tabindex': '0'
      },

      behaviors: [
        Polymer.IronControlState,
        Polymer.IronButtonState
      ]
    });
Polymer({
      is: 'paper-item-body'
    });
(function() {

  Polymer({

    is: 'paper-menu',

    behaviors: [
      Polymer.IronMenuBehavior
    ]

  });

})();
(function() {

  Polymer({

    is: 'paper-submenu',

    properties: {
      /**
       * Fired when the submenu is opened.
       *
       * @event paper-submenu-open
       */

      /**
       * Fired when the submenu is closed.
       *
       * @event paper-submenu-close
       */

      /**
       * Set opened to true to show the collapse element and to false to hide it.
       *
       * @attribute opened
       */
      opened: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_openedChanged'
      }
    },

    behaviors: [
      Polymer.IronControlState
    ],

    get __parent() {
      return Polymer.dom(this).parentNode;
    },

    get __trigger() {
      return Polymer.dom(this.$.trigger).getDistributedNodes()[0];
    },

    attached: function() {
      this.listen(this.__parent, 'iron-activate', '_onParentIronActivate');
    },

    dettached: function() {
      this.unlisten(this.__parent, 'iron-activate', '_onParentIronActivate');
    },

    /**
     * Expand the submenu content.
     */
    open: function() {
      if (this.disabled)
        return;
      this.$.collapse.show();
      this._active = true;
      this.__trigger.classList.add('iron-selected');
    },

    /**
     * Collapse the submenu content.
     */
    close: function() {
      this.$.collapse.hide();
      this._active = false;
      this.__trigger.classList.remove('iron-selected');
    },

    /**
     * A handler that is called when the trigger is tapped.
     */
    _onTap: function() {
      if (this.disabled)
        return;
      this.$.collapse.toggle();
    },

    /**
     * Toggles the submenu content when the trigger is tapped.
     */
    _openedChanged: function(opened, oldOpened) {
      if (opened) {
        this.fire('paper-submenu-open');
      } else if (oldOpened != null) {
        this.fire('paper-submenu-close');
      }
    },

    /**
     * A handler that is called when `iron-activate` is fired.
     *
     * @param {CustomEvent} event An `iron-activate` event.
     */
    _onParentIronActivate: function(event) {
      if (Polymer.Gestures.findOriginalTarget(event) !== this.__parent) {
        return;
      }

      // The activated item can either be this submenu, in which case it
      // should be expanded, or any of the other sibling submenus, in which
      // case this submenu should be collapsed.
      if (event.detail.item == this) {
        if (this._active)
          return;
        this.open();
      } else {
        this.close();
      }
    },

    /**
     * If the dropdown is open when disabled becomes true, close the
     * dropdown.
     *
     * @param {boolean} disabled True if disabled, otherwise false.
     */
    _disabledChanged: function(disabled) {
      Polymer.IronControlState._disabledChanged.apply(this, arguments);
      if (disabled && this._active) {
        this.close();

      }
    }

  });

})();
Polymer({

    is: 'paper-progress',

    behaviors: [
      Polymer.IronRangeBehavior
    ],

    properties: {

      /**
       * The number that represents the current secondary progress.
       */
      secondaryProgress: {
        type: Number,
        value: 0
      },

      /**
       * The secondary ratio
       */
      secondaryRatio: {
        type: Number,
        value: 0,
        readOnly: true
      },

      /**
       * Use an indeterminate progress indicator.
       */
      indeterminate: {
        type: Boolean,
        value: false,
        observer: '_toggleIndeterminate'
      },

      /**
       * True if the progress is disabled.
       */
      disabled: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        observer: '_disabledChanged'
      }
    },

    observers: [
      '_progressChanged(secondaryProgress, value, min, max)'
    ],

    hostAttributes: {
      role: 'progressbar'
    },

    _toggleIndeterminate: function(indeterminate) {
      // If we use attribute/class binding, the animation sometimes doesn't translate properly
      // on Safari 7.1. So instead, we toggle the class here in the update method.
      this.toggleClass('indeterminate', indeterminate, this.$.primaryProgress);
    },

    _transformProgress: function(progress, ratio) {
      var transform = 'scaleX(' + (ratio / 100) + ')';
      progress.style.transform = progress.style.webkitTransform = transform;
    },

    _mainRatioChanged: function(ratio) {
      this._transformProgress(this.$.primaryProgress, ratio);
    },

    _progressChanged: function(secondaryProgress, value, min, max) {
      secondaryProgress = this._clampValue(secondaryProgress);
      value = this._clampValue(value);

      var secondaryRatio = this._calcRatio(secondaryProgress) * 100;
      var mainRatio = this._calcRatio(value) * 100;

      this._setSecondaryRatio(secondaryRatio);
      this._transformProgress(this.$.secondaryProgress, secondaryRatio);
      this._transformProgress(this.$.primaryProgress, mainRatio);

      this.secondaryProgress = secondaryProgress;

      this.setAttribute('aria-valuenow', value);
      this.setAttribute('aria-valuemin', min);
      this.setAttribute('aria-valuemax', max);
    },

    _disabledChanged: function(disabled) {
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    },

    _hideSecondaryProgress: function(secondaryRatio) {
      return secondaryRatio === 0;
    }

  });
Polymer({
      is: 'paper-radio-button',

      behaviors: [
        Polymer.PaperCheckedElementBehavior
      ],

      hostAttributes: {
        role: 'radio',
        'aria-checked': false,
        tabindex: 0
      },

      properties: {
        /**
         * Fired when the checked state changes due to user interaction.
         *
         * @event change
         */

        /**
         * Fired when the checked state changes.
         *
         * @event iron-change
         */

        ariaActiveAttribute: {
          type: String,
          value: 'aria-checked'
        }
      },

      // create the element ripple inside the `radioContainer`
      _createRipple: function() {
        this._rippleContainer = this.$.radioContainer;
        return Polymer.PaperInkyFocusBehaviorImpl._createRipple.call(this);
      }
    });
Polymer({
    is: 'paper-radio-group',

    behaviors: [
      Polymer.IronA11yKeysBehavior,
      Polymer.IronSelectableBehavior
    ],

    hostAttributes: {
      role: 'radiogroup',
      tabindex: 0
    },

    properties: {
      /**
       * Fired when the radio group selection changes.
       *
       * @event paper-radio-group-changed
       */

      /**
       * Overriden from Polymer.IronSelectableBehavior
       */
      attrForSelected: {
        type: String,
        value: 'name'
      },

      /**
       * Overriden from Polymer.IronSelectableBehavior
       */
      selectedAttribute: {
        type: String,
        value: 'checked'
      },

      /**
       * Overriden from Polymer.IronSelectableBehavior
       */
      selectable: {
        type: String,
        value: 'paper-radio-button'
      },

      /**
       * If true, radio-buttons can be deselected
       */
      allowEmptySelection: {
        type: Boolean,
        value: false
      }
    },

    keyBindings: {
      'left up': 'selectPrevious',
      'right down': 'selectNext',
    },

    /**
     * Selects the given value.
     */
     select: function(value) {
      if (this.selected) {
        var oldItem = this._valueToItem(this.selected);

        if (this.selected == value) {
          // If deselecting is allowed we'll have to apply an empty selection.
          // Otherwise, we should force the selection to stay and make this
          // action a no-op.
          if (this.allowEmptySelection) {
            value = '';
          } else {
            oldItem.checked = true;
            return;
          }
        }

        if (oldItem)
          oldItem.checked = false;
      }

      Polymer.IronSelectableBehavior.select.apply(this, [value]);
      this.fire('paper-radio-group-changed');
    },

    /**
     * Selects the previous item. If the previous item is disabled, then it is
     * skipped, and its previous item is selected
     */
    selectPrevious: function() {
      var length = this.items.length;
      var newIndex = Number(this._valueToIndex(this.selected));

      do {
        newIndex = (newIndex - 1 + length) % length;
      } while (this.items[newIndex].disabled)

      this.select(this._indexToValue(newIndex));
    },

    /**
     * Selects the next item. If the next item is disabled, then it is
     * skipped, and the next item after it is selected.
     */
    selectNext: function() {
      var length = this.items.length;
      var newIndex = Number(this._valueToIndex(this.selected));

      do {
        newIndex = (newIndex + 1 + length) % length;
      } while (this.items[newIndex].disabled)

      this.select(this._indexToValue(newIndex));
    },
  });
Polymer({
    is: 'paper-slider',

    behaviors: [
      Polymer.IronFormElementBehavior,
      Polymer.PaperInkyFocusBehavior,
      Polymer.IronRangeBehavior
    ],

    properties: {

      /**
       * If true, the slider thumb snaps to tick marks evenly spaced based
       * on the `step` property value.
       */
      snaps: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * If true, a pin with numeric value label is shown when the slider thumb
       * is pressed. Use for settings for which users need to know the exact
       * value of the setting.
       */
      pin: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * The number that represents the current secondary progress.
       */
      secondaryProgress: {
        type: Number,
        value: 0,
        notify: true,
        observer: '_secondaryProgressChanged'
      },

      /**
       * If true, an input is shown and user can use it to set the slider value.
       */
      editable: {
        type: Boolean,
        value: false
      },

      /**
       * The immediate value of the slider.  This value is updated while the user
       * is dragging the slider.
       */
      immediateValue: {
        type: Number,
        value: 0,
        readOnly: true,
        notify: true
      },

      /**
       * The maximum number of markers
       */
      maxMarkers: {
        type: Number,
        value: 0,
        notify: true,
        observer: '_maxMarkersChanged'
      },

      /**
       * If true, the knob is expanded
       */
      expand: {
        type: Boolean,
        value: false,
        readOnly: true
      },

      /**
       * True when the user is dragging the slider.
       */
      dragging: {
        type: Boolean,
        value: false,
        readOnly: true
      },

      transiting: {
        type: Boolean,
        value: false,
        readOnly: true
      },

      markers: {
        type: Array,
        readOnly: true,
        value: []
      },
    },

    observers: [
      '_updateKnob(value, min, max, snaps, step)',
      '_valueChanged(value)',
      '_immediateValueChanged(immediateValue)'
    ],

    hostAttributes: {
      role: 'slider',
      tabindex: 0
    },

    keyBindings: {
      'left down pagedown home': '_decrementKey',
      'right up pageup end': '_incrementKey'
    },

    ready: function() {
      // issue polymer/polymer#1305
      this.async(function() {
        this._updateKnob(this.value);
      }, 1);
    },

    /**
     * Increases value by `step` but not above `max`.
     * @method increment
     */
    increment: function() {
      this.value = this._clampValue(this.value + this.step);
    },

    /**
     * Decreases value by `step` but not below `min`.
     * @method decrement
     */
    decrement: function() {
      this.value = this._clampValue(this.value - this.step);
    },

    _updateKnob: function(value, min, max, snaps, step) {
      this.setAttribute('aria-valuemin', min);
      this.setAttribute('aria-valuemax', max);
      this.setAttribute('aria-valuenow', value);

      this._positionKnob(this._calcRatio(value));
    },

    _valueChanged: function() {
      this.fire('value-change');
    },

    _immediateValueChanged: function() {
      if (this.dragging) {
        this.fire('immediate-value-change');
      } else {
        this.value = this.immediateValue;
      }
    },

    _secondaryProgressChanged: function() {
      this.secondaryProgress = this._clampValue(this.secondaryProgress);
    },

    _expandKnob: function() {
      this._setExpand(true);
    },

    _resetKnob: function() {
      this.cancelDebouncer('expandKnob');
      this._setExpand(false);
    },

    _positionKnob: function(ratio) {
      this._setImmediateValue(this._calcStep(this._calcKnobPosition(ratio)));
      this._setRatio(this._calcRatio(this.immediateValue));

      this.$.sliderKnob.style.left = (this.ratio * 100) + '%';
    },

    _calcKnobPosition: function(ratio) {
      return (this.max - this.min) * ratio + this.min;
    },

    _onTrack: function(event) {
      event.stopPropagation();
      switch (event.detail.state) {
        case 'start':
          this._trackStart(event);
          break;
        case 'track':
          this._trackX(event);
          break;
        case 'end':
          this._trackEnd();
          break;
      }
    },

    _trackStart: function(event) {
      this._w = this.$.sliderBar.offsetWidth;
      this._x = this.ratio * this._w;
      this._startx = this._x || 0;
      this._minx = - this._startx;
      this._maxx = this._w - this._startx;
      this.$.sliderKnob.classList.add('dragging');
      this._setDragging(true);
    },

    _trackX: function(e) {
      if (!this.dragging) {
        this._trackStart(e);
      }

      var dx = Math.min(this._maxx, Math.max(this._minx, e.detail.dx));
      this._x = this._startx + dx;

      var immediateValue = this._calcStep(this._calcKnobPosition(this._x / this._w));
      this._setImmediateValue(immediateValue);

      // update knob's position
      var translateX = ((this._calcRatio(immediateValue) * this._w) - this._startx);
      this.translate3d(translateX + 'px', 0, 0, this.$.sliderKnob);
    },

    _trackEnd: function() {
      var s = this.$.sliderKnob.style;

      this.$.sliderKnob.classList.remove('dragging');
      this._setDragging(false);
      this._resetKnob();
      this.value = this.immediateValue;

      s.transform = s.webkitTransform = '';

      this.fire('change');
    },

    _knobdown: function(event) {
      this._expandKnob();

      // cancel selection
      event.preventDefault();

      // set the focus manually because we will called prevent default
      this.focus();
    },

    _bardown: function(event) {
      this._w = this.$.sliderBar.offsetWidth;
      var rect = this.$.sliderBar.getBoundingClientRect();
      var ratio = (event.detail.x - rect.left) / this._w;
      var prevRatio = this.ratio;

      this._setTransiting(true);

      this._positionKnob(ratio);

      this.debounce('expandKnob', this._expandKnob, 60);

      // if the ratio doesn't change, sliderKnob's animation won't start
      // and `_knobTransitionEnd` won't be called
      // Therefore, we need to manually update the `transiting` state

      if (prevRatio === this.ratio) {
        this._setTransiting(false);
      }

      this.async(function() {
        this.fire('change');
      });

      // cancel selection
      event.preventDefault();
    },

    _knobTransitionEnd: function(event) {
      if (event.target === this.$.sliderKnob) {
        this._setTransiting(false);
      }
    },

    _maxMarkersChanged: function(maxMarkers) {
      var l = (this.max - this.min) / this.step;
      if (!this.snaps && l > maxMarkers) {
        this._setMarkers([]);
      } else {
        this._setMarkers(new Array(l));
      }
    },

    _mergeClasses: function(classes) {
      return Object.keys(classes).filter(
        function(className) {
          return classes[className];
        }).join(' ');
    },

    _getClassNames: function() {
      return this._mergeClasses({
        disabled: this.disabled,
        pin: this.pin,
        snaps: this.snaps,
        ring: this.immediateValue <= this.min,
        expand: this.expand,
        dragging: this.dragging,
        transiting: this.transiting,
        editable: this.editable
      });
    },

    _incrementKey: function(event) {
      if (!this.disabled) {
        if (event.detail.key === 'end') {
          this.value = this.max;
        } else {
          this.increment();
        }
        this.fire('change');
      }
    },

    _decrementKey: function(event) {
      if (!this.disabled) {
        if (event.detail.key === 'home') {
          this.value = this.min;
        } else {
          this.decrement();
        }
        this.fire('change');
      }
    },

    _changeValue: function(event) {
      this.value = event.target.value;
      this.fire('change');
    },

    _inputKeyDown: function(event) {
      event.stopPropagation();
    },

    // create the element ripple inside the `sliderKnob`
    _createRipple: function() {
      this._rippleContainer = this.$.sliderKnob;
      return Polymer.PaperInkyFocusBehaviorImpl._createRipple.call(this);
    },

    // Hide the ripple when user is not interacting with keyboard.
    // This behavior is different from other ripple-y controls, but is
    // according to spec: https://www.google.com/design/spec/components/sliders.html
    _focusedChanged: function(receivedFocusFromKeyboard) {
      if (receivedFocusFromKeyboard) {
        this.ensureRipple();
      }
      if (this.hasRipple()) {
        // note, ripple must be un-hidden prior to setting `holdDown`
        if (receivedFocusFromKeyboard) {
          this._ripple.removeAttribute('hidden');
        } else {
          this._ripple.setAttribute('hidden', '');
        }
        this._ripple.holdDown = receivedFocusFromKeyboard;
      }
    }

  });

  /**
   * Fired when the slider's value changes.
   *
   * @event value-change
   */

  /**
   * Fired when the slider's immediateValue changes.
   *
   * @event immediate-value-change
   */

  /**
   * Fired when the slider's value changes due to user interaction.
   *
   * Changes to the slider's value due to changes in an underlying
   * bound variable will not trigger this event.
   *
   * @event change
   */
Polymer({
      is: 'paper-spinner',

      listeners: {
        'animationend': 'reset',
        'webkitAnimationEnd': 'reset'
      },

      properties: {
        /**
         * Displays the spinner.
         *
         * @attribute active
         * @type boolean
         * @default false
         */
        active: {
          type: Boolean,
          value: false,
          reflectToAttribute: true,
          observer: '_activeChanged'
        },

        /**
         * Alternative text content for accessibility support.
         * If alt is present, it will add an aria-label whose content matches alt when active.
         * If alt is not present, it will default to 'loading' as the alt value.
         *
         * @attribute alt
         * @type string
         * @default 'loading'
         */
        alt: {
          type: String,
          value: 'loading',
          observer: '_altChanged'
        },

        /**
         * True when the spinner is going from active to inactive. This is represented by a fade
         * to 0% opacity to the user.
         */
        _coolingDown: {
          type: Boolean,
          value: false
        },

        _spinnerContainerClassName: {
          type: String,
          computed: '_computeSpinnerContainerClassName(active, _coolingDown)'
        }
      },

      _computeSpinnerContainerClassName: function(active, coolingDown) {
        return [
          active || coolingDown ? 'active' : '',
          coolingDown ? 'cooldown' : ''
        ].join(' ');
      },

      _activeChanged: function(active, old) {
        this._setAriaHidden(!active);
        this._coolingDown = !active && old;
      },

      _altChanged: function(alt) {
        // user-provided `aria-label` takes precedence over prototype default
        if (alt === this.getPropertyInfo('alt').value) {
          this.alt = this.getAttribute('aria-label') || alt;
        } else {
          this._setAriaHidden(alt==='');
          this.setAttribute('aria-label', alt);
        }
      },

      _setAriaHidden: function(hidden) {
        var attr = 'aria-hidden';
        if (hidden) {
          this.setAttribute(attr, 'true');
        } else {
          this.removeAttribute(attr);
        }
      },

      reset: function() {
        this.active = false;
        this._coolingDown = false;
      }
    });
Polymer({

    is: 'paper-tab',

    behaviors: [
      Polymer.IronControlState,
      Polymer.IronButtonState,
      Polymer.PaperRippleBehavior
    ],

    hostAttributes: {
      role: 'tab'
    },

    listeners: {
      down: '_updateNoink'
    },

    ready: function() {
      var ripple = this.getRipple();
      ripple.initialOpacity = 0.95;
      ripple.opacityDecayVelocity = 0.98;
    },

    attached: function() {
      this._updateNoink();
    },

    get _parentNoink () {
      var parent = Polymer.dom(this).parentNode;
      return !!parent && !!parent.noink;
    },

    _updateNoink: function() {
      this.noink = !!this.noink || !!this._parentNoink;
    }
  });
Polymer({

    is: 'paper-tabs',

    behaviors: [
      Polymer.IronResizableBehavior,
      Polymer.IronMenubarBehavior
    ],

    properties: {

      /**
       * If true, ink ripple effect is disabled. When this property is changed,
       * all descendant `<paper-tab>` elements have their `noink` property
       * changed to the new value as well.
       */
      noink: {
        type: Boolean,
        value: false,
        observer: '_noinkChanged'
      },

      /**
       * If true, the bottom bar to indicate the selected tab will not be shown.
       */
      noBar: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the slide effect for the bottom bar is disabled.
       */
      noSlide: {
        type: Boolean,
        value: false
      },

      /**
       * If true, tabs are scrollable and the tab width is based on the label width.
       */
      scrollable: {
        type: Boolean,
        value: false
      },

      /**
       * If true, dragging on the tabs to scroll is disabled.
       */
      disableDrag: {
        type: Boolean,
        value: false
      },

      /**
       * If true, scroll buttons (left/right arrow) will be hidden for scrollable tabs.
       */
      hideScrollButtons: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the tabs are aligned to bottom (the selection bar appears at the top).
       */
      alignBottom: {
        type: Boolean,
        value: false
      },

      /**
       * Gets or sets the selected element. The default is to use the index of the item.
       */
      selected: {
        type: String,
        notify: true
      },

      selectable: {
        type: String,
        value: 'paper-tab'
      },

      _step: {
        type: Number,
        value: 10
      },

      _holdDelay: {
        type: Number,
        value: 1
      },

      _leftHidden: {
        type: Boolean,
        value: false
      },

      _rightHidden: {
        type: Boolean,
        value: false
      },

      _previousTab: {
        type: Object
      }
    },

    hostAttributes: {
      role: 'tablist'
    },

    listeners: {
      'iron-resize': '_onResize',
      'iron-select': '_onIronSelect',
      'iron-deselect': '_onIronDeselect'
    },

    created: function() {
      this._holdJob = null;
    },

    ready: function() {
      this.setScrollDirection('y', this.$.tabsContainer);
    },

    _noinkChanged: function(noink) {
      var childTabs = Polymer.dom(this).querySelectorAll('paper-tab');
      childTabs.forEach(noink ? this._setNoinkAttribute : this._removeNoinkAttribute);
    },

    _setNoinkAttribute: function(element) {
      element.setAttribute('noink', '');
    },

    _removeNoinkAttribute: function(element) {
      element.removeAttribute('noink');
    },

    _computeScrollButtonClass: function(hideThisButton, scrollable, hideScrollButtons) {
      if (!scrollable || hideScrollButtons) {
        return 'hidden';
      }

      if (hideThisButton) {
        return 'not-visible';
      }

      return '';
    },

    _computeTabsContentClass: function(scrollable) {
      return scrollable ? 'scrollable' : 'horizontal layout';
    },

    _computeSelectionBarClass: function(noBar, alignBottom) {
      if (noBar) {
        return 'hidden';
      } else if (alignBottom) {
        return 'align-bottom';
      }
    },

    // TODO(cdata): Add `track` response back in when gesture lands.

    _onResize: function() {
      this.debounce('_onResize', function() {
        this._scroll();
        this._tabChanged(this.selectedItem);
      }, 10);
    },

    _onIronSelect: function(event) {
      this._tabChanged(event.detail.item, this._previousTab);
      this._previousTab = event.detail.item;
      this.cancelDebouncer('tab-changed');
    },

    _onIronDeselect: function(event) {
      this.debounce('tab-changed', function() {
        this._tabChanged(null, this._previousTab);
      // See polymer/polymer#1305
      }, 1);
    },

    get _tabContainerScrollSize () {
      return Math.max(
        0,
        this.$.tabsContainer.scrollWidth -
          this.$.tabsContainer.offsetWidth
      );
    },


    _scroll: function(e, detail) {
      if (!this.scrollable) {
        return;
      }

      var ddx = (detail && -detail.ddx) || 0;
      this._affectScroll(ddx);
    },

    _down: function(e) {
      // go one beat async to defeat IronMenuBehavior
      // autorefocus-on-no-selection timeout
      this.async(function() {
        if (this._defaultFocusAsync) {
          this.cancelAsync(this._defaultFocusAsync);
          this._defaultFocusAsync = null;
        }
      }, 1);
    },

    _affectScroll: function(dx) {
      this.$.tabsContainer.scrollLeft += dx;

      var scrollLeft = this.$.tabsContainer.scrollLeft;

      this._leftHidden = scrollLeft === 0;
      this._rightHidden = scrollLeft === this._tabContainerScrollSize;
    },

    _onLeftScrollButtonDown: function() {
      this._scrollToLeft();
      this._holdJob = setInterval(this._scrollToLeft.bind(this), this._holdDelay);
    },

    _onRightScrollButtonDown: function() {
      this._scrollToRight();
      this._holdJob = setInterval(this._scrollToRight.bind(this), this._holdDelay);
    },

    _onScrollButtonUp: function() {
      clearInterval(this._holdJob);
      this._holdJob = null;
    },

    _scrollToLeft: function() {
      this._affectScroll(-this._step);
    },

    _scrollToRight: function() {
      this._affectScroll(this._step);
    },

    _tabChanged: function(tab, old) {
      if (!tab) {
        this._positionBar(0, 0);
        return;
      }

      var r = this.$.tabsContent.getBoundingClientRect();
      var w = r.width;
      var tabRect = tab.getBoundingClientRect();
      var tabOffsetLeft = tabRect.left - r.left;

      this._pos = {
        width: this._calcPercent(tabRect.width, w),
        left: this._calcPercent(tabOffsetLeft, w)
      };

      if (this.noSlide || old == null) {
        // position bar directly without animation
        this._positionBar(this._pos.width, this._pos.left);
        return;
      }

      var oldRect = old.getBoundingClientRect();
      var oldIndex = this.items.indexOf(old);
      var index = this.items.indexOf(tab);
      var m = 5;

      // bar animation: expand
      this.$.selectionBar.classList.add('expand');

      if (oldIndex < index) {
        this._positionBar(this._calcPercent(tabRect.left + tabRect.width - oldRect.left, w) - m,
            this._left);
      } else {
        this._positionBar(this._calcPercent(oldRect.left + oldRect.width - tabRect.left, w) - m,
            this._calcPercent(tabOffsetLeft, w) + m);
      }

      if (this.scrollable) {
        this._scrollToSelectedIfNeeded(tabRect.width, tabOffsetLeft);
      }
    },

    _scrollToSelectedIfNeeded: function(tabWidth, tabOffsetLeft) {
      var l = tabOffsetLeft - this.$.tabsContainer.scrollLeft;
      if (l < 0) {
        this.$.tabsContainer.scrollLeft += l;
      } else {
        l += (tabWidth - this.$.tabsContainer.offsetWidth);
        if (l > 0) {
          this.$.tabsContainer.scrollLeft += l;
        }
      }
    },

    _calcPercent: function(w, w0) {
      return 100 * w / w0;
    },

    _positionBar: function(width, left) {
      width = width || 0;
      left = left || 0;

      this._width = width;
      this._left = left;
      this.transform(
          'translate3d(' + left + '%, 0, 0) scaleX(' + (width / 100) + ')',
          this.$.selectionBar);
    },

    _onBarTransitionEnd: function(e) {
      var cl = this.$.selectionBar.classList;
      // bar animation: expand -> contract
      if (cl.contains('expand')) {
        cl.remove('expand');
        cl.add('contract');
        this._positionBar(this._pos.width, this._pos.left);
      // bar animation done
      } else if (cl.contains('contract')) {
        cl.remove('contract');
      }
    }

  });
(function() {

  var PaperToast = Polymer({
    is: 'paper-toast',

    properties: {
      /**
       * The duration in milliseconds to show the toast.
       */
      duration: {
        type: Number,
        value: 3000
      },

      /**
       * The text to display in the toast.
       */
      text: {
        type: String,
        value: ""
      },

      /**
       * True if the toast is currently visible.
       */
      visible: {
        type: Boolean,
        readOnly: true,
        value: false,
        observer: '_visibleChanged'
      }
    },

    created: function() {
      Polymer.IronA11yAnnouncer.requestAvailability();
    },

    ready: function() {
      this.async(function() {
        this.hide();
      });
    },

    /**
     * Show the toast.
     * @method show
     */
    show: function() {
      if (PaperToast.currentToast) {
        PaperToast.currentToast.hide();
      }
      PaperToast.currentToast = this;
      this.removeAttribute('aria-hidden');
      this._setVisible(true);
      this.fire('iron-announce', {
        text: this.text
      });
      this.debounce('hide', this.hide, this.duration);
    },

    /**
     * Hide the toast
     */
    hide: function() {
      this.setAttribute('aria-hidden', 'true');
      this._setVisible(false);
    },

    /**
     * Toggle the opened state of the toast.
     * @method toggle
     */
    toggle: function() {
      if (!this.visible) {
        this.show();
      } else {
        this.hide();
      }
    },

    _visibleChanged: function(visible) {
      this.toggleClass('paper-toast-open', visible);
    }
  });

  PaperToast.currentToast = null;

})();
Polymer({
      is: 'paper-toggle-button',

      behaviors: [
        Polymer.PaperCheckedElementBehavior
      ],

      hostAttributes: {
        role: 'button',
        'aria-pressed': 'false',
        tabindex: 0
      },

      properties: {
        /**
         * Fired when the checked state changes due to user interaction.
         *
         * @event change
         */
        /**
         * Fired when the checked state changes.
         *
         * @event iron-change
         */
      },

      listeners: {
        track: '_ontrack'
      },

      _ontrack: function(event) {
        var track = event.detail;
        if (track.state === 'start') {
          this._trackStart(track);
        } else if (track.state === 'track') {
          this._trackMove(track);
        } else if (track.state === 'end') {
          this._trackEnd(track);
        }
      },

      _trackStart: function(track) {
        this._width = this.$.toggleBar.offsetWidth / 2;
        /*
         * keep an track-only check state to keep the dragging behavior smooth
         * while toggling activations
         */
        this._trackChecked = this.checked;
        this.$.toggleButton.classList.add('dragging');
      },

      _trackMove: function(track) {
        var dx = track.dx;
        this._x = Math.min(this._width,
            Math.max(0, this._trackChecked ? this._width + dx : dx));
        this.translate3d(this._x + 'px', 0, 0, this.$.toggleButton);
        this._userActivate(this._x > (this._width / 2));
      },

      _trackEnd: function(track) {
        this.$.toggleButton.classList.remove('dragging');
        this.transform('', this.$.toggleButton);
      },

      // customize the element's ripple
      _createRipple: function() {
        this._rippleContainer = this.$.toggleButton;
        var ripple = Polymer.PaperRippleBehavior._createRipple();
        ripple.id = 'ink';
        ripple.setAttribute('recenters', '');
        ripple.classList.add('circle', 'toggle-ink');
        return ripple;
      }

    });
(function() {

    'use strict';

    function classNames(obj) {
      var classNames = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key) && obj[key]) {
          classNames.push(key);
        }
      }

      return classNames.join(' ');
    }

    Polymer({

      is: 'paper-toolbar',

      hostAttributes: {
        'role': 'toolbar'
      },

      properties: {

        /**
         * Controls how the items are aligned horizontally when they are placed
         * at the bottom.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         *
         * @attribute bottomJustify
         * @type string
         * @default ''
         */
        bottomJustify: {
          type: String,
          value: ''
        },

        /**
         * Controls how the items are aligned horizontally.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         *
         * @attribute justify
         * @type string
         * @default ''
         */
        justify: {
          type: String,
          value: ''
        },

        /**
         * Controls how the items are aligned horizontally when they are placed
         * in the middle.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         *
         * @attribute middleJustify
         * @type string
         * @default ''
         */
        middleJustify: {
          type: String,
          value: ''
        }

      },

      attached: function() {
        this._observer = this._observe(this);
        this._updateAriaLabelledBy();
      },

      detached: function() {
        if (this._observer) {
          this._observer.disconnect();
        }
      },

      _observe: function(node) {
        var observer = new MutationObserver(function() {
          this._updateAriaLabelledBy();
        }.bind(this));
        observer.observe(node, {
          childList: true,
          subtree: true
        });
        return observer;
      },

      _updateAriaLabelledBy: function() {
        var labelledBy = [];
        var contents = Polymer.dom(this.root).querySelectorAll('content');
        for (var content, index = 0; content = contents[index]; index++) {
          var nodes = Polymer.dom(content).getDistributedNodes();
          for (var node, jndex = 0; node = nodes[jndex]; jndex++) {
            if (node.classList && node.classList.contains('title')) {
              if (node.id) {
                labelledBy.push(node.id);
              } else {
                var id = 'paper-toolbar-label-' + Math.floor(Math.random() * 10000);
                node.id = id;
                labelledBy.push(id);
              }
            }
          }
        }
        if (labelledBy.length > 0) {
          this.setAttribute('aria-labelledby', labelledBy.join(' '));
        }
      },

      _computeBarClassName: function(barJustify) {
        var classObj = {
          'center': true,
          'horizontal': true,
          'layout': true,
          'toolbar-tools': true
        };

        // If a blank string or any falsy value is given, no other class name is
        // added.
        if (barJustify) {
          var justifyClassName = (barJustify === 'justified') ?
              barJustify :
              barJustify + '-justified';

          classObj[justifyClassName] = true;
        }

        return classNames(classObj);
      }

    });

  }());
Polymer({
      is: 'paper-tooltip',

      hostAttributes: {
        role: 'tooltip',
        tabindex: -1
      },

      behaviors: [
        Polymer.NeonAnimationRunnerBehavior
      ],

      properties: {
        /**
         * The id of the element that the tooltip is anchored to. This element
         * must be a sibling of the tooltip.
         */
        for: {
          type: String,
          observer: '_forChanged'
        },

        /**
         * Positions the tooltip to the top, right, bottom, left of its content.
         */
        position: {
          type: String,
          value: 'bottom'
        },

        /**
         * If true, no parts of the tooltip will ever be shown offscreen.
         */
        fitToVisibleBounds: {
          type: Boolean,
          value: false
        },

        /**
         * The spacing between the top of the tooltip and the element it is
         * anchored to.
         */
        offset: {
          type: Number,
          value: 14
        },

        /**
         * This property is deprecated, but left over so that it doesn't
         * break exiting code. Please use `offset` instead. If both `offset` and
         * `marginTop` are provided, `marginTop` will be ignored.
         * @deprecated since version 1.0.3
         */
        marginTop: {
          type: Number,
          value: 14
        },

        /**
         * The delay that will be applied before the `entry` animation is
         * played when showing the tooltip.
         */
        animationDelay: {
          type: Number,
          value: 500
        },

        /**
         * The entry and exit animations that will be played when showing and
         * hiding the tooltip. If you want to override this, you must ensure
         * that your animationConfig has the exact format below.
         */
        animationConfig: {
          type: Object,
          value: function() {
            return {
              'entry': [{
                name: 'fade-in-animation',
                node: this,
                timing: {delay: 0}
              }],
              'exit': [{
                name: 'fade-out-animation',
                node: this
              }]
            }
          }
        },

        _showing: {
          type: Boolean,
          value: false
        }
      },

      listeners: {
        'neon-animation-finish': '_onAnimationFinish',
        'mouseenter': 'hide'
      },

      /**
       * Returns the target element that this tooltip is anchored to. It is
       * either the element given by the `for` attribute, or the immediate parent
       * of the tooltip.
       */
      get target () {
        var parentNode = Polymer.dom(this).parentNode;
        // If the parentNode is a document fragment, then we need to use the host.
        var ownerRoot = Polymer.dom(this).getOwnerRoot();

        var target;
        if (this.for) {
          target = Polymer.dom(ownerRoot).querySelector('#' + this.for);
        } else {
          target = parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE ?
              ownerRoot.host : parentNode;
        }

        return target;
      },

      attached: function() {
        this._target = this.target;

        this.listen(this._target, 'mouseenter', 'show');
        this.listen(this._target, 'focus', 'show');
        this.listen(this._target, 'mouseleave', 'hide');
        this.listen(this._target, 'blur', 'hide');
        this.listen(this._target, 'tap', 'hide');
      },

      detached: function() {
        if (this._target) {
          this.unlisten(this._target, 'mouseenter', 'show');
          this.unlisten(this._target, 'focus', 'show');
          this.unlisten(this._target, 'mouseleave', 'hide');
          this.unlisten(this._target, 'blur', 'hide');
          this.unlisten(this._target, 'tap', 'hide');
        }
      },

      show: function() {
        // If the tooltip is already showing, there's nothing to do.
        if (this._showing)
          return;

        if (Polymer.dom(this).textContent.trim() === '')
          return;


        this.cancelAnimation();
        this._showing = true;
        this.toggleClass('hidden', false, this.$.tooltip);
        this.updatePosition();

        this.animationConfig.entry[0].timing.delay = this.animationDelay;
        this._animationPlaying = true;
        this.playAnimation('entry');
      },

      hide: function() {
        // If the tooltip is already hidden, there's nothing to do.
        if (!this._showing) {
          return;
        }

        // If the entry animation is still playing, don't try to play the exit
        // animation since this will reset the opacity to 1. Just end the animation.
        if (this._animationPlaying) {
          this.cancelAnimation();
          this._showing = false;
          this._onAnimationFinish();
          return;
        }

        this._showing = false;
        this._animationPlaying = true;
        this.playAnimation('exit');
      },

      _forChanged: function() {
        this._target = this.target;
      },

      updatePosition: function() {
        if (!this._target)
          return;

        var offset = this.offset;
        // If a marginTop has been provided by the user (pre 1.0.3), use it.
        if (this.marginTop != 14 && this.offset == 14)
          offset = this.marginTop;

        var parentRect = this.offsetParent.getBoundingClientRect();
        var targetRect = this._target.getBoundingClientRect();
        var thisRect = this.getBoundingClientRect();

        var horizontalCenterOffset = (targetRect.width - thisRect.width) / 2;
        var verticalCenterOffset = (targetRect.height - thisRect.height) / 2;

        var targetLeft = targetRect.left - parentRect.left;
        var targetTop = targetRect.top - parentRect.top;

        var tooltipLeft, tooltipTop;

        switch (this.position) {
          case 'top':
            tooltipLeft = targetLeft + horizontalCenterOffset;
            tooltipTop = targetTop - thisRect.height - offset;
            break;
          case 'bottom':
            tooltipLeft = targetLeft + horizontalCenterOffset;
            tooltipTop = targetTop + targetRect.height + offset;
            break;
          case 'left':
            tooltipLeft = targetLeft - thisRect.width - offset;
            tooltipTop = targetTop + verticalCenterOffset;
            break;
          case 'right':
            tooltipLeft = targetLeft + targetRect.width + offset;
            tooltipTop = targetTop + verticalCenterOffset;
            break;
        }

        // TODO(noms): This should use IronFitBehavior if possible.
        if (this.fitToVisibleBounds) {
          // Clip the left/right side.
          if (tooltipLeft + thisRect.width > window.innerWidth) {
            this.style.right = '0px';
            this.style.left = 'auto';
          } else {
            this.style.left = Math.max(0, tooltipLeft) + 'px';
            this.style.right = 'auto';
          }

          // Clip the top/bottom side.
          if (tooltipTop + thisRect.height > window.innerHeight) {
            this.style.bottom = '0px';
            this.style.top = 'auto';
          } else {
            this.style.top = Math.max(0, tooltipTop) + 'px';
            this.style.bottom = 'auto';
          }
        } else {
          this.style.left = tooltipLeft + 'px';
          this.style.top = tooltipTop + 'px';
        }

      },

      _onAnimationFinish: function() {
        this._animationPlaying = false;
        if (!this._showing) {
          this.toggleClass('hidden', true, this.$.tooltip);
        }
      },
    });
(function() {

  'use strict';

  Polymer.PaperScrollHeaderPanel = Polymer({

    /**
     * Fired when the content has been scrolled.
     *
     * @event content-scroll
     */

    /**
     * Fired when the header is transformed.
     *
     * @event paper-header-transform
     */

    is: 'paper-scroll-header-panel',

    behaviors: [
      Polymer.IronResizableBehavior
    ],

    properties: {

      /**
       * If true, the header's height will condense to `condensedHeaderHeight`
       * as the user scrolls down from the top of the content area.
       */
      condenses: {
        type: Boolean,
        value: false
      },

      /**
       * If true, no cross-fade transition from one background to another.
       */
      noDissolve: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the header doesn't slide back in when scrolling back up.
       */
      noReveal: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the header is fixed to the top and never moves away.
       */
      fixed: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the condensed header is always shown and does not move away.
       */
      keepCondensedHeader: {
        type: Boolean,
        value: false
      },

      /**
       * The height of the header when it is at its full size.
       *
       * By default, the height will be measured when it is ready.  If the height
       * changes later the user needs to either set this value to reflect the
       * new height or invoke `measureHeaderHeight()`.
       */
      headerHeight: {
        type: Number,
        value: 0
      },

      /**
       * The height of the header when it is condensed.
       *
       * By default, `condensedHeaderHeight` is 1/3 of `headerHeight` unless
       * this is specified.
       */
      condensedHeaderHeight: {
        type: Number,
        value: 0
      },

      /**
       * By default, the top part of the header stays when the header is being
       * condensed.  Set this to true if you want the top part of the header
       * to be scrolled away.
       */
      scrollAwayTopbar: {
        type: Boolean,
        value: false
      },

      /**
       * The state of the header. Depending on the configuration and the `scrollTop` value,
       * the header state could change to
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_EXPANDED
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_HIDDEN
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_CONDENSED
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_INTERPOLATED
       */
      headerState: {
        type: Number,
        readOnly: true,
        value: 0
      },

      _prevScrollTop: {
        type: Number,
        value: 0
      },

      _y: {
        type: Number,
        value: 0
      },

      /** @type {number|null} */
      _defaultCondsensedHeaderHeight: {
        type: Number,
        value: 0
      }
    },

    observers: [
      '_setup(headerHeight, condensedHeaderHeight, fixed)',
      '_condensedHeaderHeightChanged(condensedHeaderHeight)',
      '_headerHeightChanged(headerHeight, condensedHeaderHeight)',
      '_condensesChanged(condenses)',
    ],

    listeners: {
      'iron-resize': 'measureHeaderHeight'
    },

    ready: function() {
      this.async(this.measureHeaderHeight, 5);
      this._scrollHandler = this._scroll.bind(this);
      this.scroller.addEventListener('scroll', this._scrollHandler);
    },

    /**
     * Returns the header element.
     *
     * @property header
     * @type Object
     */
    get header() {
      return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
    },

    /**
     * Returns the content element.
     *
     * @property content
     * @type Object
     */
    get content() {
      return Polymer.dom(this.$.mainContent).getDistributedNodes()[0];
    },

    /**
     * Returns the scrollable element.
     *
     * @property scroller
     * @type Object
     */
    get scroller() {
      return this.$.mainContainer;
    },

    get _headerMaxDelta() {
      return this.keepCondensedHeader ? this._headerMargin : this.headerHeight;
    },

    get _headerMargin() {
      return this.headerHeight - this.condensedHeaderHeight;
    },

    _y: 0,

    _prevScrollTop: 0,

    /**
     * Invoke this to tell `paper-scroll-header-panel` to re-measure the header's
     * height.
     *
     * @method measureHeaderHeight
     */
    measureHeaderHeight: function() {
      var header = this.header;
      if (header && header.offsetHeight) {
        this.headerHeight = header.offsetHeight;
      }
    },

    /**
     * Scroll to a specific y coordinate.
     *
     * @method scroll
     * @param {number} top The coordinate to scroll to, along the y-axis.
     * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
     */
    scroll: function(top, smooth) {
      // the scroll event will trigger _updateScrollState directly,
      // However, _updateScrollState relies on the previous `scrollTop` to update the states.
      // Calling _updateScrollState will ensure that the states are synced correctly.

      if (smooth) {
        // TODO(blasten): use CSS scroll-behavior once it ships in Chrome.
        var easingFn = function easeOutQuad(t, b, c, d) {
          t /= d;
          return -c * t*(t-2) + b;
        };
        var animationId = Math.random();
        var duration = 200;
        var startTime = Date.now();
        var currentScrollTop = this.scroller.scrollTop;
        var deltaScrollTop = top - currentScrollTop;

        this._currentAnimationId = animationId;

        (function updateFrame() {
          var now = Date.now();
          var elapsedTime = now - startTime;

          if (elapsedTime > duration) {
            this.scroller.scrollTop = top;
            this._updateScrollState(top);

          } else if (this._currentAnimationId === animationId) {
            this.scroller.scrollTop = easingFn(elapsedTime, currentScrollTop, deltaScrollTop, duration);
            requestAnimationFrame(updateFrame.bind(this));
          }

        }).call(this);

      } else {
        this.scroller.scrollTop = top;
        this._updateScrollState(top);
      }
    },

   /**
     * Condense the header.
     *
     * @method condense
     * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
     */
    condense: function(smooth) {
      var ctx = Polymer.PaperScrollHeaderPanel;
      if (this.condenses && !this.fixed && !this.noReveal) {
        switch (this.headerState) {
          case ctx.HEADER_STATE_HIDDEN:
            this.scroll(this.scroller.scrollTop - (this._headerMaxDelta - this._headerMargin), smooth);
          break;
          case ctx.HEADER_STATE_EXPANDED:
          case ctx.HEADER_STATE_INTERPOLATED:
            this.scroll(this._headerMargin, smooth);
          break;
        }
      }
    },

    /**
     * Scroll to the top of the content.
     *
     * @method scrollToTop
     * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
     */
    scrollToTop: function(smooth) {
      this.scroll(0, smooth);
    },

    _headerHeightChanged: function(headerHeight) {
      if (this._defaultCondsensedHeaderHeight !== null) {
        this._defaultCondsensedHeaderHeight = Math.round(headerHeight * 1/3);
        this.condensedHeaderHeight = this._defaultCondsensedHeaderHeight;
      }
    },

    _condensedHeaderHeightChanged: function(condensedHeaderHeight) {
      if (condensedHeaderHeight) {
        // a user custom value
        if (this._defaultCondsensedHeaderHeight != condensedHeaderHeight) {
          // disable the default value
          this._defaultCondsensedHeaderHeight = null;
        }
      }
    },

    _condensesChanged: function() {
      this._updateScrollState(this.scroller.scrollTop);
      this._condenseHeader(null);
    },

    _setup: function() {
      var s = this.scroller.style;

      s.paddingTop = this.fixed ? '' : this.headerHeight + 'px';
      s.top = this.fixed ? this.headerHeight + 'px' : '';

      if (this.fixed) {
        this._setHeaderState(this.HEADER_STATE_EXPANDED);
        this._transformHeader(null);
      } else {
        switch (this.headerState) {
          case this.HEADER_STATE_HIDDEN:
            this._transformHeader(this._headerMaxDelta);
            break;
          case this.HEADER_STATE_CONDENSED:
            this._transformHeader(this._headerMargin);
            break;
        }
      }
    },

    _transformHeader: function(y) {
      this._translateY(this.$.headerContainer, -y);

      if (this.condenses) {
        this._condenseHeader(y);
      }

      this.fire('paper-header-transform',
        { y: y,
          height: this.headerHeight,
          condensedHeight: this.condensedHeaderHeight
        }
      );
    },

    _condenseHeader: function(y) {
      var reset = (y === null);

      // adjust top bar in paper-header so the top bar stays at the top
      if (!this.scrollAwayTopbar && this.header && this.header.$ && this.header.$.topBar) {
        this._translateY(this.header.$.topBar,
            reset ? null : Math.min(y, this._headerMargin));
      }
      // transition header bg
      if (!this.noDissolve) {
        this.$.headerBg.style.opacity = reset ? '' :
            ( (this._headerMargin - y) / this._headerMargin);
      }
      // adjust header bg so it stays at the center
      this._translateY(this.$.headerBg, reset ? null : y / 2);
      // transition condensed header bg
      if (!this.noDissolve) {
        this.$.condensedHeaderBg.style.opacity = reset ? '' :
            (y / this._headerMargin);

        // adjust condensed header bg so it stays at the center
        this._translateY(this.$.condensedHeaderBg, reset ? null : y / 2);
      }
    },

    _translateY: function(node, y) {
      this.transform((y === null) ? '' : 'translate3d(0, ' + y + 'px, 0)', node);
    },

    /** @param {Event=} event */
    _scroll: function(event) {
      if (this.header) {
        this._updateScrollState(this.scroller.scrollTop);

        this.fire('content-scroll', {
          target: this.scroller
        },
        {
          cancelable: false
        });
      }
    },

    _updateScrollState: function(scrollTop) {
      var ctx = Polymer.PaperScrollHeaderPanel;
      var deltaScrollTop = scrollTop - this._prevScrollTop;
      var y = Math.max(0, (this.noReveal) ? scrollTop : this._y + deltaScrollTop);

      if (y > this._headerMaxDelta) {
        y = this._headerMaxDelta;
        this._setHeaderState(ctx.HEADER_STATE_HIDDEN);

      } else if (this.condenses && this._prevScrollTop >= scrollTop && scrollTop >= this._headerMargin) {
        y = Math.max(y, this._headerMargin);
        this._setHeaderState(ctx.HEADER_STATE_CONDENSED);

      } else if (y === 0) {
        this._setHeaderState(ctx.HEADER_STATE_EXPANDED);

      } else {
        this._setHeaderState(ctx.HEADER_STATE_INTERPOLATED);
      }

      if (!this.fixed && y !== this._y) {
        this._transformHeader(y);
      }

      this._prevScrollTop = Math.max(scrollTop, 0);
      this._y = y;
    }
  });

  Polymer.PaperScrollHeaderPanel.HEADER_STATE_EXPANDED = 0;
  Polymer.PaperScrollHeaderPanel.HEADER_STATE_HIDDEN = 1;
  Polymer.PaperScrollHeaderPanel.HEADER_STATE_CONDENSED = 2;
  Polymer.PaperScrollHeaderPanel.HEADER_STATE_INTERPOLATED = 3;

})();
(function() {
    'use strict';

    var SUPPORTED = 'bluetooth' in navigator;

    // This allows us to use BluetoothDevice related attributes type in
    // browsers where it is not defined.
    if (!('BluetoothDevice' in window)) {
      window.BluetoothDevice = {};
    }

    /**
     * The `<platinum-bluetooth-device>` element allows you to [discover nearby
     * bluetooth devices][1] thanks to the young [Web Bluetooth API][2]. It is
     * currently only partially implemented in Chrome OS 45 behind the
     * experimental flag `chrome://flags/#enable-web-bluetooth`.
     *
     * `<platinum-bluetooth-device>` is used as a parent element for
     * `<platinum-bluetooth-characteristic>` child elements.
     *
     * For instance, here's how to request a nearby bluetooth device advertising
     * Battery service :
     *
     * ```html
     * <platinum-bluetooth-device
     *     services-filter='["battery_service"]'>
     * </platinum-bluetooth-device>
     * ```
     * ```js
     * button.addEventListener('click', function() {
     *   document.querySelector('platinum-bluetooth-device').request()
     *   .then(function(device) { console.log(device.name); })
     *   .catch(function(error) { console.error(error); });
     * });
     * ```
     *
     * [1]: https://developers.google.com/web/updates/2015/07/interact-with-ble-devices-on-the-web
     * [2]: https://github.com/WebBluetoothCG/web-bluetooth
     *
     * @hero hero.svg
     * @demo
     */

    Polymer({

      is: 'platinum-bluetooth-device',

      properties: {

        /**
         * Indicates whether the Web Bluetooth API is supported by
         * this browser.
         */
        supported: {
          readOnly: true,
          type: Boolean,
          value: SUPPORTED
        },

        /**
         * Required Bluetooth GATT services filter. You may provide either the
         * full Bluetooth UUID as a string or a short 16- or 32-bit form as
         * integers like 0x180d.
         */
        servicesFilter: {
          type: Array,
          observer: '_servicesFilterChanged'
        },

        /**
         * Internal variable used to cache Bluetooth device.
         */
        _device: {
          type: BluetoothDevice,
          observer: '_deviceChanged'
        },

      },

      /**
      * Update all characteristics when device changes.
       */
      _deviceChanged: function() {
        this._updateCharacteristics();
      },

      /**
       * Reset device when services-filter property is changed.
       */
      _servicesFilterChanged: function() {
        this._device = null;
      },

      /**
       * Set the internal device object on each characteristic child.
       */
      _updateCharacteristics: function() {
        this._characteristics = Polymer.dom(this.$.characteristics).getDistributedNodes();
        for (var i = 0; i < this._characteristics.length; i++) {
          this._characteristics[i]._device = this._device;
        }
      },

      created: function() {
        this._characteristics = [];
      },

      /**
       * Reset device to pick a new device.
       */
      reset: function() {
        this._device = null;
      },

      /**
       * Request a nearby bluetooth device and returns a Promise that will
       * resolve when user picked one Bluetooth device.
       *
       * It must be called on user gesture.
       *
       * @return {Promise<BluetoothDevice>}
       */
      request: function() {
        if (!this.supported) {
          return Promise.reject(new Error('Your browser does not support Bluetooth'));
        }
        if (this._device) {
          this._updateCharacteristics();
          // Resolve promise if user already picked one device.
          return Promise.resolve(this._device);
        }
        if (!this.servicesFilter || this.servicesFilter.length == 0) {
          return Promise.reject(new Error('Please set Bluetooth services filter.'));
        }
        var self = this;
        return navigator.bluetooth.requestDevice({filters:[{services: this.servicesFilter}]})
          .then(function(device) {
            // Cache device for later use.
            self._device = device;
            return self._device;
          });
      },

    });
  })();
Polymer({
      is: 'platinum-https-redirect',

      _isLocalhost: function(hostname) {
        // !! coerces the logical expression to evaluate to the values true or false.
        return !!(hostname === 'localhost' ||
                  // [::1] is the IPv6 localhost address.
                  hostname === '[::1]' ||
                  // 127.0.0.1/8 is considered localhost for IPv4.
                  hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));
      },

      attached: function() {
        if (window.location.protocol === 'http:' && !this._isLocalhost(window.location.hostname)) {
          // Redirect to https: if we're currently using http: and we're not on localhost.
          window.location.protocol = 'https:';
        }
      }
    });
Polymer({

    is: 'google-map-directions',

/**
Fired whenever the directions service returns a result.

@event google-map-response
@param {{response: Object}}} detail
*/
    properties: {
      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: String,

      /**
       * The Google map object.
       *
       * @type google.maps.Map
       */
      map: {
        type: Object,
        observer: '_mapChanged'
      },
      /**
       * Start address or latlng to get directions from.
       *
       * @type string|google.maps.LatLng
       */
      startAddress: {
        type: String,
        value: null
      },

      /**
       * End address or latlng for directions to end.
       *
       * @type string|google.maps.LatLng
       */
      endAddress: {
        type: String,
        value: null
      },

      /**
       * Travel mode to use.  One of 'DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'.
       */
      travelMode: {
        type: String,
        value: 'DRIVING'
      },

      /**
       * Array of intermediate waypoints. Directions will be calculated
       * from the origin to the destination by way of each waypoint in this array.
       * The maximum allowed waypoints is 8, plus the origin, and destination.
       * Maps API for Business customers are allowed 23 waypoints,
       * plus the origin, and destination.
       * Waypoints are not supported for transit directions. Optional.
       *
       * @type google.maps.DirectionsWaypoint
       */
       waypoints: {
         type: Array,
         value: function() { return []; }
       },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String,
        value: null
      },

      /**
       * Options for the display of results
       */
      rendererOptions: {
        type: Object,
        value: function() { return {}; }
      },

      /**
       * The response from the directions service.
       *
       */
      response: {
        type: Object,
        observer: '_responseChanged',
        notify: true
      }
    },

    observers: [
      '_route(startAddress, endAddress, travelMode, waypoints)'
    ],

    _mapApiLoaded: function() {
      this._route();
    },

    _responseChanged: function() {
      if (this.directionsRenderer && this.response) {
        this.directionsRenderer.setDirections(this.response);
      }
    },

    _mapChanged: function() {
      if (this.map && this.map instanceof google.maps.Map) {
        if (!this.directionsRenderer) {
          this.directionsRenderer = new google.maps.DirectionsRenderer(this.rendererOptions);
        }
        this.directionsRenderer.setMap(this.map);
        this._responseChanged();
      } else {
        // If there is no more map, remove the directionsRenderer from the map and delete it.
        if (this.directionsRenderer) {
          this.directionsRenderer.setMap(null);
          this.directionsRenderer = null;
        }
      }
    },

    _route: function() {
      // Abort attempts to _route if the API is not available yet or the
      // required attributes are blank.
      if (typeof google == 'undefined' || typeof google.maps == 'undefined' ||
          !this.startAddress || !this.endAddress) {
        return;
      }

      // Construct a directionsService if necessary.
      // Wait until here where the maps api has loaded and directions are actually needed.
      if (!this.directionsService) {
        this.directionsService = new google.maps.DirectionsService();
      }

      var request = {
        origin: this.startAddress,
        destination: this.endAddress,
        travelMode: this.travelMode,
        waypoints: this.waypoints
      };
      this.directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          this.response = response;
          this.fire('google-map-response', {response: response});
        }
      }.bind(this));
    }
  });
(function() {

  function setupDragHandler_() {
    if (this.draggable) {
      this.dragHandler_ = google.maps.event.addListener(
          this.marker, 'dragend', onDragEnd_.bind(this));
    } else {
      google.maps.event.removeListener(this.dragHandler_);
      this.dragHandler_ = null;
    }
  }

  function onDragEnd_(e, details, sender) {
    this.latitude = e.latLng.lat();
    this.longitude = e.latLng.lng();
  }

  Polymer({

    is: 'google-map-marker',

    /**
     * Fired when the marker icon was clicked. Requires the clickEvents attribute to be true.
     * @param {google.maps.MouseEvent} event The mouse event.
     * @event google-map-marker-click
     */

    /**
     * Fired when the marker icon was double clicked. Requires the clickEvents attribute to be true.
     * @param {google.maps.MouseEvent} event The mouse event.
     * @event google-map-marker-dblclick
     */

    /**
     * Fired for a mousedown on the marker. Requires the mouseEvents attribute to be true.
     * @event google-map-marker-mousedown
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the DOM `mousemove` event is fired on the marker. Requires the mouseEvents
     * attribute to be true.
     * @event google-map-marker-mousemove
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the mouse leaves the area of the marker icon. Requires the mouseEvents attribute to be
     * true.
     * @event google-map-marker-mouseout
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the mouse enters the area of the marker icon. Requires the mouseEvents attribute to be
     * true.
     * @event google-map-marker-mouseover
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired for a mouseup on the marker. Requires the mouseEvents attribute to be true.
     *
     * @event google-map-marker-mouseup
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired for a rightclick on the marker. Requires the clickEvents attribute to be true.
     * @event google-map-marker-rightclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when an infowindow is opened.
     * @event google-map-marker-open
     */

    /**
     * Fired when the close button of the infowindow is pressed.
     * @event google-map-marker-close
     */

    properties: {
      /**
       * A Google Maps marker object.
       * @type google.maps.Marker
       */
      marker: Object,

      /**
       * The Google map object.
       * @type google.maps.Map
       */
      map: {
        type: Object,
        observer: '_mapChanged'
      },

      /**
       * A Google Map Infowindow object.
       */
      info: {
        type: Object,
        value: null
      },

      /**
       * When true, marker *click events are automatically registered.
       */
      clickEvents: {
        type: Boolean,
        value: false,
        observer: '_clickEventsChanged'
      },

      /**
       * Image URL for the marker icon.
       * @type string|google.maps.Icon|google.maps.Symbol
       */
      icon: {
        type: Object,
        value: null,
        observer: '_iconChanged'
      },

      /**
       * When true, marker mouse* events are automatically registered.
       */
      mouseEvents: {
        type: Boolean,
        value: false,
        observer: '_mouseEventsChanged'
      },

      /**
       * Z-index for the marker icon.
       */
      zIndex: {
        type: Number,
        value: 0,
        observer: '_zIndexChanged'
      },

      /**
       * The marker's longitude coordinate.
       */
      longitude: {
        type: Number,
        value: null,
        reflectToAttribute: true
      },

      /**
       * The marker's latitude coordinate.
       */
      latitude: {
        type: Number,
        value: null,
        reflectToAttribute: true
      },

      /**
       * A animation for the marker. "DROP" or "BOUNCE". See
       * https://developers.google.com/maps/documentation/javascript/examples/marker-animations.
       */
      animation: {
        type: String,
        value: null,
        observer: '_animationChanged'
      },

      /**
       * Specifies whether the InfoWindow is open or not
       */
      open: {
        type: Boolean,
        value: false,
        observer: '_openChanged'
      }
    },

    observers: [
      '_updatePosition(latitude, longitude)'
    ],

    detached: function() {
      if (this.marker) {
        this.marker.setMap(null);
      }
      if (this._contentObserver)
        this._contentObserver.disconnect();
    },

    attached: function() {
      // If element is added back to DOM, put it back on the map.
      if (this.marker) {
        this.marker.setMap(this.map);
      }
    },

    _updatePosition: function() {
      if (this.marker && this.latitude != null && this.longitude != null) {
        this.marker.setPosition({
          lat: parseFloat(this.latitude),
          lng: parseFloat(this.longitude)
        });
      }
    },

    _clickEventsChanged: function() {
      if (this.map) {
        if (this.clickEvents) {
          this._forwardEvent('click');
          this._forwardEvent('dblclick');
          this._forwardEvent('rightclick');
        } else {
          this._clearListener('click');
          this._clearListener('dblclick');
          this._clearListener('rightclick');
        }
      }
    },

    _mouseEventsChanged: function() {
      if (this.map) {
        if (this.mouseEvents) {
          this._forwardEvent('mousedown');
          this._forwardEvent('mousemove');
          this._forwardEvent('mouseout');
          this._forwardEvent('mouseover');
          this._forwardEvent('mouseup');
        } else {
          this._clearListener('mousedown');
          this._clearListener('mousemove');
          this._clearListener('mouseout');
          this._clearListener('mouseover');
          this._clearListener('mouseup');
        }
      }
    },

    _animationChanged: function() {
      if (this.marker) {
        this.marker.setAnimation(google.maps.Animation[this.animation]);
      }
    },

    _iconChanged: function() {
      if (this.marker) {
        this.marker.setIcon(this.icon);
      }
    },

    _zIndexChanged: function() {
      if (this.marker) {
        this.marker.setZIndex(this.zIndex);
      }
    },

    _mapChanged: function() {
      // Marker will be rebuilt, so disconnect existing one from old map and listeners.
      if (this.marker) {
        this.marker.setMap(null);
        google.maps.event.clearInstanceListeners(this.marker);
      }

      if (this.map && this.map instanceof google.maps.Map) {
        this._mapReady();
      }
    },

    _contentChanged: function() {
      if (this._contentObserver)
        this._contentObserver.disconnect();
      // Watch for future updates.
      this._contentObserver = new MutationObserver( this._contentChanged.bind(this));
      this._contentObserver.observe( this, {
        childList: true,
        subtree: true
      });

      var content = this.innerHTML.trim();
      if (content) {
        if (!this.info) {
          // Create a new infowindow
          this.info = new google.maps.InfoWindow();
          this.openInfoHandler_ = google.maps.event.addListener(this.marker, 'click', function() {
            this.open = true;
          }.bind(this));

          this.closeInfoHandler_ = google.maps.event.addListener(this.info, 'closeclick', function() {
            this.open = false;
          }.bind(this));
        }
        this.info.setContent(content);
      } else {
        if (this.info) {
          // Destroy the existing infowindow.  It doesn't make sense to have an empty one.
          google.maps.event.removeListener(this.openInfoHandler_);
          google.maps.event.removeListener(this.closeInfoHandler_);
          this.info = null;
        }
      }
    },

    _openChanged: function() {
      if (this.info) {
        if (this.open) {
          this.info.open(this.map, this.marker);
          this.fire('google-map-marker-open');
        } else {
          this.info.close();
          this.fire('google-map-marker-close');
        }
      }
    },

    _mapReady: function() {
      this._listeners = {};
      this.marker = new google.maps.Marker({
        map: this.map,
        position: {
          lat: parseFloat(this.latitude),
          lng: parseFloat(this.longitude)
        },
        title: this.title,
        animation: google.maps.Animation[this.animation],
        draggable: this.draggable,
        visible: !this.hidden,
        icon: this.icon,
        zIndex: this.zIndex
      });
      this._contentChanged();
      this._clickEventsChanged();
      this._contentChanged();
      this._mouseEventsChanged();
      this._openChanged();
      setupDragHandler_.bind(this)();
    },

    _clearListener: function(name) {
      if (this._listeners[name]) {
        google.maps.event.removeListener(this._listeners[name]);
        this._listeners[name] = null;
      }
    },

    _forwardEvent: function(name) {
      this._listeners[name] = google.maps.event.addListener(this.marker, name, function(event) {
        this.fire('google-map-marker-' + name, event);
      }.bind(this));
    },

    attributeChanged: function(attrName, oldVal, newVal) {
      if (!this.marker) {
        return;
      }

      // Cannot use *Changed watchers for native properties.
      switch (attrName) {
        case 'hidden':
          this.marker.setVisible(!this.hidden);
          break;
        case 'draggable':
          this.marker.setDraggable(this.draggable);
          setupDragHandler_.bind(this)();
          break;
        case 'title':
          this.marker.setTitle(this.title);
          break;
      }
    }
  });

})();
Polymer({

    is: 'google-map',


    /**
     * Fired when the Maps API has fully loaded.
     * @event google-map-ready
     */
    /**
     * Fired when the when the user clicks on the map (but not when they click on a marker, infowindow, or
     * other object). Requires the clickEvents attribute to be true.
     * @event google-map-click
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user double-clicks on the map. Note that the google-map-click event will also fire,
     * right before this one. Requires the clickEvents attribute to be true.
     * @event google-map-dblclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired repeatedly while the user drags the map. Requires the dragEvents attribute to be true.
     * @event google-map-drag
     */
    /**
     * Fired when the user stops dragging the map. Requires the dragEvents attribute to be true.
     * @event google-map-dragend
     */
    /**
     * Fired when the user starts dragging the map. Requires the dragEvents attribute to be true.
     * @event google-map-dragstart
     */
    /**
     * Fired whenever the user's mouse moves over the map container. Requires the mouseEvents attribute to
     * be true.
     * @event google-map-mousemove
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user's mouse exits the map container. Requires the mouseEvents attribute to be true.
     * @event google-map-mouseout
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user's mouse enters the map container. Requires the mouseEvents attribute to be true.
     * @event google-map-mouseover
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the DOM `contextmenu` event is fired on the map container. Requires the clickEvents
     * attribute to be true.
     * @event google-map-rightclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    properties: {
      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: String,

      /**
       * A Maps API for Business Client ID. To obtain a Maps API for Business Client ID, see developers.google.com/maps/documentation/business/.
       * If set, a Client ID will take precedence over an API Key.
       */
      clientId: String,

      /**
       * A latitude to center the map on.
       */
      latitude: {
        type: Number,
        value: 37.77493,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * A Maps API object.
       */
      map: {
        type: Object,
        notify: true,
        value: null
      },

      /**
       * A longitude to center the map on.
       */
      longitude: {
        type: Number,
        value: -122.41942,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * A kml file to load.
       */
      kml: {
        type: String,
        value: null,
        observer: '_loadKml'
      },

      /**
       * A zoom level to set the map to.
       */
      zoom: {
        type: Number,
        value: 10,
        observer: '_zoomChanged',
        notify: true
      },

      /**
       * When set, prevents the map from tilting (when the zoom level and viewport supports it).
       */
      noAutoTilt: {
        type: Boolean,
        value: false
      },

      /**
       * Map type to display. One of 'roadmap', 'satellite', 'hybrid', 'terrain'.
       */
      mapType: {
        type: String,
        value: 'roadmap', // roadmap, satellite, hybrid, terrain,
        observer: '_mapTypeChanged',
        notify: true
      },

      /**
       * Version of the Google Maps API to use.
       */
      version: {
        type: String,
        value: '3.exp'
      },

      /**
       * If set, removes the map's default UI controls.
       */
      disableDefaultUi: {
        type: Boolean,
        value: false,
        observer: '_disableDefaultUiChanged'
      },

      /**
       * If set, the zoom level is set such that all markers (google-map-marker children) are brought into view.
       */
      fitToMarkers: {
        type: Boolean,
        value: false,
        observer: '_fitToMarkersChanged'
      },

      /**
       * If true, prevent the user from zooming the map interactively.
       */
      disableZoom: {
        type: Boolean,
        value: false,
        observer: '_disableZoomChanged'
      },

      /**
       * If set, custom styles can be applied to the map.
       * For style documentation see developers.google.com/maps/documentation/javascript/reference#MapTypeStyle
       */
      styles: {
        type: Object,
        value: function() { return {}; }
      },

      /**
       * A maximum zoom level which will be displayed on the map.
       */
      maxZoom: {
        type: Number,
        observer: '_maxZoomChanged'
      },

      /**
       * A minimum zoom level which will be displayed on the map.
       */
      minZoom: {
        type: Number,
        observer: '_minZoomChanged'
      },

      /**
       * If true, sign-in is enabled.
       * See https://developers.google.com/maps/documentation/javascript/signedin#enable_sign_in
       */
      signedIn: {
        type: Boolean,
        value: false
      },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String
      },

      /**
       * When true, map *click events are automatically registered.
       */
      clickEvents: {
        type: Boolean,
        value: false,
        observer: '_clickEventsChanged'
      },

      /**
       * When true, map drag* events are automatically registered.
       */
      dragEvents: {
        type: Boolean,
        value: false,
        observer: '_dragEventsChanged'
      },

      /**
       * When true, map mouse* events are automatically registered.
       */
      mouseEvents: {
        type: Boolean,
        value: false,
        observer: '_mouseEventsChanged'
      },

      /**
       * Additional map options for google.maps.Map constructor.
       * Use to specify additional options we do not expose as
       * properties.
       * Ex: `<google-map additional-map-options='{"mapTypeId":"satellite"}'>`
       *
       * Note, you can't use API enums like `google.maps.ControlPosition.TOP_RIGHT`
       * when using this property as an HTML attribute. Instead, use the actual
       * value (e.g. `3`) or set `.additionalMapOptions` in JS rather than using
       * the attribute.
       */
      additionalMapOptions: {
        type: Object,
        value: function() { return {}; }
      },

      /**
       * The markers on the map.
       */
      markers: {
        type: Array,
        value: function() { return []; },
        readOnly: true
      },

      /**
       * The non-marker objects on the map.
       */
      objects: {
        type: Array,
        value: function() { return []; },
        readOnly: true
      },

      /**
       * If set, all other info windows on markers are closed when opening a new one.
       */
      singleInfoWindow: {
        type: Boolean,
        value: false
      }
    },

    behaviors: [
      Polymer.IronResizableBehavior
    ],

    listeners: {
      'iron-resize': 'resize'
    },

    observers: [
      '_debounceUpdateCenter(latitude, longitude)'
    ],

    attached: function() {
      this._initGMap();
    },

    detached: function() {
      if (this._mutationObserver) {
        this._mutationObserver.disconnect();
        this._mutationObserver = null;
      }
      if (this._objectsMutationObserver) {
        this._objectsMutationObserver.disconnect();
        this._objectsMutationObserver = null;
      }
    },

    _initGMap: function() {
      if (this.map) {
        return; // already initialized
      }
      if (this.$.api.libraryLoaded !== true) {
        return; // api not loaded
      }
      if (!this.isAttached) {
        return; // not attached
      }

      this.map = new google.maps.Map(this.$.map, this._getMapOptions());
      this._listeners = {};
      this._updateCenter();
      this._loadKml();
      this._updateMarkers();
      this._updateObjects();
      this._addMapListeners();
      this.fire('google-map-ready');
    },

    _mapApiLoaded: function() {
      this._initGMap();
    },

    _getMapOptions: function() {
      var mapOptions = {
        zoom: this.zoom,
        tilt: this.noAutoTilt ? 0 : 45,
        mapTypeId: this.mapType,
        disableDefaultUI: this.disableDefaultUi,
        disableDoubleClickZoom: this.disableZoom,
        scrollwheel: !this.disableZoom,
        styles: this.styles,
        maxZoom: Number(this.maxZoom),
        minZoom: Number(this.minZoom)
      };

      // Only override the default if set.
      // We use getAttribute here because the default value of this.draggable = false even when not set.
      if (this.getAttribute('draggable') != null) {
        mapOptions.draggable = this.draggable
      }
      for (var p in this.additionalMapOptions)
        mapOptions[p] = this.additionalMapOptions[p];

      return mapOptions;
    },

    _attachChildrenToMap: function(children) {
      if (this.map) {
        for (var i = 0, child; child = children[i]; ++i) {
          child.map = this.map;
        }
      }
    },

    // watch for future updates to marker objects
    _observeMarkers: function() {
      // Watch for future updates.
      if (this._mutationObserver) {
        return;
      }
      this._mutationObserver = new MutationObserver(this._updateMarkers.bind(this));
      this._mutationObserver.observe(this.$.selector, {
        childList: true
      });
    },

    _updateMarkers: function() {
      var newMarkers = Array.prototype.slice.call(
          Polymer.dom(this.$.markers).getDistributedNodes());

      // do not recompute if markers have not been added or removed
      if (newMarkers.length === this.markers.length) {
        var added = newMarkers.filter(function(m) {
          return this.markers && this.markers.indexOf(m) === -1;
        }.bind(this));
        if (added.length === 0) {
          // set up observer first time around
          if (!this._mutationObserver) {
            this._observeMarkers();
          }
          return;
        }
      }

      this._observeMarkers();

      this.markers = this._setMarkers(newMarkers);

      // Set the map on each marker and zoom viewport to ensure they're in view.
      this._attachChildrenToMap(this.markers);
      if (this.fitToMarkers) {
        this._fitToMarkersChanged();
      }
    },

    // watch for future updates to non-marker objects
    _observeObjects: function() {
      if (this._objectsMutationObserver) {
        return;
      }
      this._objectsMutationObserver = new MutationObserver(this._updateObjects.bind(this));
      this._objectsMutationObserver.observe(this, {
        childList: true
      });
    },

    _updateObjects: function() {
      var newObjects = Array.prototype.slice.call(
          Polymer.dom(this.$.objects).getDistributedNodes());

      // Do not recompute if objects have not been added or removed.
      if (newObjects.length === this.objects.length) {
        var added = newObjects.filter(function(o) {
          return this.objects.indexOf(o) === -1;
        }.bind(this));
        if (added.length === 0) {
          // Set up observer first time around.
          this._observeObjects();
          return;
        }
      }

      this._observeObjects();
      this._setObjects(newObjects);
      this._attachChildrenToMap(this.objects);
    },

    /**
     * Clears all markers from the map.
     *
     * @method clear
     */
    clear: function() {
      for (var i = 0, m; m = this.markers[i]; ++i) {
        m.marker.setMap(null);
      }
    },

    /**
     * Explicitly resizes the map, updating its center. This is useful if the
     * map does not show after you have unhidden it.
     *
     * @method resize
     */
    resize: function() {
      if (this.map) {

        // saves and restores latitude/longitude because resize can move the center
        var oldLatitude = this.latitude;
        var oldLongitude = this.longitude;
        google.maps.event.trigger(this.map, 'resize');
        this.latitude = oldLatitude;  // restore because resize can move our center
        this.longitude = oldLongitude;

        if (this.fitToMarkers) { // we might not have a center if we are doing fit-to-markers
          this._fitToMarkersChanged();
        }
      }
    },

    _loadKml: function() {
      if (this.kml) {
        var kmlfile = new google.maps.KmlLayer({
          url: this.kml,
          map: this.map
        });
      }
    },

    _debounceUpdateCenter: function() {
      this.debounce('updateCenter', this._updateCenter);
    },

    _updateCenter: function() {
      this.cancelDebouncer('updateCenter');

      if (this.map && this.latitude !== undefined && this.longitude !== undefined) {
        // allow for latitude and longitude to be String-typed, but still Number valued
        var lati = Number(this.latitude);
        if (isNaN(lati)) {
          throw new TypeError('latitude must be a number');
        }
        var longi = Number(this.longitude);
        if (isNaN(longi)) {
          throw new TypeError('longitude must be a number');
        }

        var newCenter = new google.maps.LatLng(lati, longi);
        var oldCenter = this.map.getCenter();

        if (!oldCenter) {
          // If the map does not have a center, set it right away.
          this.map.setCenter(newCenter);
        } else {
          // Using google.maps.LatLng returns corrected lat/lngs.
          oldCenter = new google.maps.LatLng(oldCenter.lat(), oldCenter.lng());

          // If the map currently has a center, slowly pan to the new one.
          if (!oldCenter.equals(newCenter)) {
            this.map.panTo(newCenter);
          }
        }
      }
    },

    _zoomChanged: function() {
      if (this.map) {
        this.map.setZoom(Number(this.zoom));
      }
    },

    _clickEventsChanged: function() {
      if (this.map) {
        if (this.clickEvents) {
          this._forwardEvent('click');
          this._forwardEvent('dblclick');
          this._forwardEvent('rightclick');
        } else {
          this._clearListener('click');
          this._clearListener('dblclick');
          this._clearListener('rightclick');
        }
      }
    },

    _dragEventsChanged: function() {
      if (this.map) {
        if (this.dragEvents) {
          this._forwardEvent('drag');
          this._forwardEvent('dragend');
          this._forwardEvent('dragstart');
        } else {
          this._clearListener('drag');
          this._clearListener('dragend');
          this._clearListener('dragstart');
        }
      }
    },

    _mouseEventsChanged: function() {
      if (this.map) {
        if (this.mouseEvents) {
          this._forwardEvent('mousemove');
          this._forwardEvent('mouseout');
          this._forwardEvent('mouseover');
        } else {
          this._clearListener('mousemove');
          this._clearListener('mouseout');
          this._clearListener('mouseover');
        }
      }
    },

    _maxZoomChanged: function() {
      if (this.map) {
        this.map.setOptions({maxZoom: Number(this.maxZoom)});
      }
    },

    _minZoomChanged: function() {
      if (this.map) {
        this.map.setOptions({minZoom: Number(this.minZoom)});
      }
    },

    _mapTypeChanged: function() {
      if (this.map) {
        this.map.setMapTypeId(this.mapType);
      }
    },

    _disableDefaultUiChanged: function() {
      if (!this.map) {
        return;
      }
      this.map.setOptions({disableDefaultUI: this.disableDefaultUi});
    },

    _disableZoomChanged: function() {
      if (!this.map) {
        return;
      }
      this.map.setOptions({
        disableDoubleClickZoom: this.disableZoom,
        scrollwheel: !this.disableZoom
      });
    },

    attributeChanged: function(attrName, oldVal, newVal) {
      if (!this.map) {
        return;
      }
      // Cannot use *Changed watchers for native properties.
      switch (attrName) {
        case 'draggable':
          this.map.setOptions({draggable: this.draggable});
          break;
      }
    },

    _fitToMarkersChanged: function() {
      // TODO(ericbidelman): respect user's zoom level.

      if (this.map && this.fitToMarkers && this.markers.length > 0) {
        var latLngBounds = new google.maps.LatLngBounds();
        for (var i = 0, m; m = this.markers[i]; ++i) {
          latLngBounds.extend(
              new google.maps.LatLng(m.latitude, m.longitude));
        }

        // For one marker, don't alter zoom, just center it.
        if (this.markers.length > 1) {
          this.map.fitBounds(latLngBounds);
        }

        this.map.setCenter(latLngBounds.getCenter());
      }
    },

    _addMapListeners: function() {
      google.maps.event.addListener(this.map, 'center_changed', function() {
        var center = this.map.getCenter();
        this.latitude = center.lat();
        this.longitude = center.lng();
      }.bind(this));

      google.maps.event.addListener(this.map, 'zoom_changed', function() {
        this.zoom = this.map.getZoom();
      }.bind(this));

      google.maps.event.addListener(this.map, 'maptypeid_changed', function() {
        this.mapType = this.map.getMapTypeId();
      }.bind(this));

      this._clickEventsChanged();
      this._dragEventsChanged();
      this._mouseEventsChanged();
    },

    _clearListener: function(name) {
      if (this._listeners[name]) {
        google.maps.event.removeListener(this._listeners[name]);
        this._listeners[name] = null;
      }
    },

    _forwardEvent: function(name) {
      this._listeners[name] = google.maps.event.addListener(this.map, name, function(event) {
        this.fire('google-map-' + name, event);
      }.bind(this));
    },

   _deselectMarker: function(e, detail) {
     // If singleInfoWindow is set, update iron-selector's selected attribute to be null.
     // Else remove the marker from iron-selector's selected array.
     var markerIndex = this.$.selector.indexOf(e.target);

     if (this.singleInfoWindow) {
      this.$.selector.selected = null;
     } else if (this.$.selector.selectedValues) {
      this.$.selector.selectedValues = this.$.selector.selectedValues.filter(function(i) {return i !== markerIndex});
     }
   }

  });