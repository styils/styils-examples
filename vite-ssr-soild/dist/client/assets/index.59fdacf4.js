const p = function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(script) {
    const fetchOpts = {};
    if (script.integrity)
      fetchOpts.integrity = script.integrity;
    if (script.referrerpolicy)
      fetchOpts.referrerPolicy = script.referrerpolicy;
    if (script.crossorigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (script.crossorigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
};
p();
const sharedConfig = {};
function setHydrateContext(context) {
  sharedConfig.context = context;
}
function nextHydrateContext() {
  return {
    ...sharedConfig.context,
    id: `${sharedConfig.context.id}${sharedConfig.context.count++}-`,
    count: 0
  };
}
const equalFn = (a, b) => a === b;
const $PROXY = Symbol("solid-proxy");
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const NOTPENDING = {};
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
const [transPending, setTransPending] = /* @__PURE__ */ createSignal(false);
var Owner = null;
let Transition = null;
let Listener = null;
let Pending = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener, owner = Owner, unowned = fn.length === 0, root = unowned && true ? UNOWNED : {
    owned: null,
    cleanups: null,
    context: null,
    owner: detachedOwner || owner
  }, updateFn = unowned ? fn : () => fn(() => cleanNode(root));
  Owner = root;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    pending: NOTPENDING,
    comparator: options.equals || void 0
  };
  const setter = (value2) => {
    if (typeof value2 === "function") {
      value2 = value2(s.pending !== NOTPENDING ? s.pending : s.value);
    }
    return writeSignal(s, value2);
  };
  return [readSignal.bind(s), setter];
}
function createComputed(fn, value, options) {
  const c = createComputation(fn, value, true, STALE);
  updateComputation(c);
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE);
  c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.pending = NOTPENDING;
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || void 0;
  updateComputation(c);
  return readSignal.bind(c);
}
function batch(fn) {
  if (Pending)
    return fn();
  let result;
  const q = Pending = [];
  try {
    result = fn();
  } finally {
    Pending = null;
  }
  runUpdates(() => {
    for (let i = 0; i < q.length; i += 1) {
      const data = q[i];
      if (data.pending !== NOTPENDING) {
        const pending = data.pending;
        data.pending = NOTPENDING;
        writeSignal(data, pending);
      }
    }
  }, false);
  return result;
}
function untrack(fn) {
  let result, listener = Listener;
  Listener = null;
  result = fn();
  Listener = listener;
  return result;
}
function on(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  let defer = options && options.defer;
  return (prevValue) => {
    let input;
    if (isArray) {
      input = Array(deps.length);
      for (let i = 0; i < deps.length; i++)
        input[i] = deps[i]();
    } else
      input = deps();
    if (defer) {
      defer = false;
      return void 0;
    }
    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}
function onMount(fn) {
  createEffect(() => untrack(fn));
}
function onCleanup(fn) {
  if (Owner === null)
    ;
  else if (Owner.cleanups === null)
    Owner.cleanups = [fn];
  else
    Owner.cleanups.push(fn);
  return fn;
}
function getOwner() {
  return Owner;
}
function runWithOwner(o, fn) {
  const prev = Owner;
  Owner = o;
  try {
    return runUpdates(fn, true);
  } finally {
    Owner = prev;
  }
}
function startTransition(fn) {
  const l = Listener;
  const o = Owner;
  return Promise.resolve().then(() => {
    Listener = l;
    Owner = o;
    let t;
    batch(fn);
    Listener = Owner = null;
    return t ? t.done : void 0;
  });
}
function useTransition() {
  return [transPending, startTransition];
}
function createContext(defaultValue) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  let ctx;
  return (ctx = lookup(Owner, context.id)) !== void 0 ? ctx : context.defaultValue;
}
function children(fn) {
  const children2 = createMemo(fn);
  return createMemo(() => resolveChildren(children2()));
}
function readSignal() {
  const runningTransition = Transition;
  if (this.sources && (this.state || runningTransition)) {
    const updates = Updates;
    Updates = null;
    this.state === STALE || runningTransition ? updateComputation(this) : lookUpstream(this);
    Updates = updates;
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}
function writeSignal(node, value, isComp) {
  if (Pending) {
    if (node.pending === NOTPENDING)
      Pending.push(node);
    node.pending = value;
    return value;
  }
  if (node.comparator) {
    if (node.comparator(node.value, value))
      return value;
  }
  let TransitionRunning = false;
  node.value = value;
  if (node.observers && node.observers.length) {
    runUpdates(() => {
      for (let i = 0; i < node.observers.length; i += 1) {
        const o = node.observers[i];
        if (TransitionRunning && Transition.disposed.has(o))
          ;
        if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
          if (o.pure)
            Updates.push(o);
          else
            Effects.push(o);
          if (o.observers)
            markDownstream(o);
        }
        if (TransitionRunning)
          ;
        else
          o.state = STALE;
      }
      if (Updates.length > 1e6) {
        Updates = [];
        if (false)
          ;
        throw new Error();
      }
    }, false);
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn)
    return;
  cleanNode(node);
  const owner = Owner, listener = Listener, time = ExecCount;
  Listener = Owner = node;
  runComputation(node, node.value, time);
  Listener = listener;
  Owner = owner;
}
function runComputation(node, value, time) {
  let nextValue;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    handleError(err);
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.observers && node.observers.length) {
      writeSignal(node, nextValue);
    } else
      node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: null,
    pure
  };
  if (Owner === null)
    ;
  else if (Owner !== UNOWNED) {
    {
      if (!Owner.owned)
        Owner.owned = [c];
      else
        Owner.owned.push(c);
    }
  }
  return c;
}
function runTop(node) {
  const runningTransition = Transition;
  if (node.state === 0 || runningTransition)
    return;
  if (node.state === PENDING || runningTransition)
    return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback))
    return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state || runningTransition)
      ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if (node.state === STALE || runningTransition) {
      updateComputation(node);
    } else if (node.state === PENDING || runningTransition) {
      const updates = Updates;
      Updates = null;
      lookUpstream(node, ancestors[0]);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates)
    return fn();
  let wait = false;
  if (!init)
    Updates = [];
  if (Effects)
    wait = true;
  else
    Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!Updates)
      Effects = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait)
    return;
  if (Effects.length)
    batch(() => {
      runEffects(Effects);
      Effects = null;
    });
  else {
    Effects = null;
  }
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++)
    runTop(queue[i]);
}
function runUserEffects(queue) {
  let i, userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user)
      runTop(e);
    else
      queue[userLength++] = e;
  }
  if (sharedConfig.context)
    setHydrateContext();
  const resume = queue.length;
  for (i = 0; i < userLength; i++)
    runTop(queue[i]);
  for (i = resume; i < queue.length; i++)
    runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  const runningTransition = Transition;
  node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      if (source.state === STALE || runningTransition) {
        if (source !== ignore)
          runTop(source);
      } else if (source.state === PENDING || runningTransition)
        lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  const runningTransition = Transition;
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!o.state || runningTransition) {
      o.state = PENDING;
      if (o.pure)
        Updates.push(o);
      else
        Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(), s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.owned) {
    for (i = 0; i < node.owned.length; i++)
      cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = 0; i < node.cleanups.length; i++)
      node.cleanups[i]();
    node.cleanups = null;
  }
  node.state = 0;
  node.context = null;
}
function handleError(err) {
  throw err;
}
function lookup(owner, key) {
  return owner ? owner.context && owner.context[key] !== void 0 ? owner.context[key] : lookup(owner.owner, key) : void 0;
}
function resolveChildren(children2) {
  if (typeof children2 === "function" && !children2.length)
    return resolveChildren(children2());
  if (Array.isArray(children2)) {
    const results = [];
    for (let i = 0; i < children2.length; i++) {
      const result = resolveChildren(children2[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children2;
}
function createProvider(id) {
  return function provider(props) {
    let res;
    createComputed(() => res = untrack(() => {
      Owner.context = {
        [id]: props.value
      };
      return children(() => props.children);
    }));
    return res;
  };
}
let hydrationEnabled = false;
function enableHydration() {
  hydrationEnabled = true;
}
function createComponent(Comp, props) {
  if (hydrationEnabled) {
    if (sharedConfig.context) {
      const c = sharedConfig.context;
      setHydrateContext(nextHydrateContext());
      const r = untrack(() => Comp(props || {}));
      setHydrateContext(c);
      return r;
    }
  }
  return untrack(() => Comp(props || {}));
}
function trueFn() {
  return true;
}
const propTraps = {
  get(_, property, receiver) {
    if (property === $PROXY)
      return receiver;
    return _.get(property);
  },
  has(_, property) {
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};
function resolveSource(s) {
  return (s = typeof s === "function" ? s() : s) == null ? {} : s;
}
function mergeProps(...sources) {
  return new Proxy({
    get(property) {
      for (let i = sources.length - 1; i >= 0; i--) {
        const v = resolveSource(sources[i])[property];
        if (v !== void 0)
          return v;
      }
    },
    has(property) {
      for (let i = sources.length - 1; i >= 0; i--) {
        if (property in resolveSource(sources[i]))
          return true;
      }
      return false;
    },
    keys() {
      const keys = [];
      for (let i = 0; i < sources.length; i++)
        keys.push(...Object.keys(resolveSource(sources[i])));
      return [...new Set(keys)];
    }
  }, propTraps);
}
function splitProps(props, ...keys) {
  const blocked = new Set(keys.flat());
  const descriptors = Object.getOwnPropertyDescriptors(props);
  const res = keys.map((k) => {
    const clone = {};
    for (let i = 0; i < k.length; i++) {
      const key = k[i];
      Object.defineProperty(clone, key, descriptors[key] ? descriptors[key] : {
        get() {
          return props[key];
        },
        set() {
          return true;
        }
      });
    }
    return clone;
  });
  res.push(new Proxy({
    get(property) {
      return blocked.has(property) ? void 0 : props[property];
    },
    has(property) {
      return blocked.has(property) ? false : property in props;
    },
    keys() {
      return Object.keys(props).filter((k) => !blocked.has(k));
    }
  }, propTraps));
  return res;
}
function Show(props) {
  let strictEqual = false;
  const condition = createMemo(() => props.when, void 0, {
    equals: (a, b) => strictEqual ? a === b : !a === !b
  });
  return createMemo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      return (strictEqual = typeof child === "function" && child.length > 0) ? untrack(() => child(c)) : child;
    }
    return props.fallback;
  });
}
const booleans = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"];
const Properties = /* @__PURE__ */ new Set(["className", "value", "readOnly", "formNoValidate", "isMap", "noModule", "playsInline", ...booleans]);
const ChildProperties = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]);
const Aliases = {
  className: "class",
  htmlFor: "for"
};
const PropAliases = {
  class: "className",
  formnovalidate: "formNoValidate",
  ismap: "isMap",
  nomodule: "noModule",
  playsinline: "playsInline",
  readonly: "readOnly"
};
const DelegatedEvents = /* @__PURE__ */ new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
const SVGElements = /* @__PURE__ */ new Set([
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animate",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "color-profile",
  "cursor",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "font",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignObject",
  "g",
  "glyph",
  "glyphRef",
  "hkern",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "missing-glyph",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "set",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  "tref",
  "tspan",
  "use",
  "view",
  "vkern"
]);
const SVGNamespace = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace"
};
function reconcileArrays(parentNode, a, b) {
  let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
      while (bStart < bEnd)
        parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart]))
          a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = /* @__PURE__ */ new Map();
        let i = bStart;
        while (i < bEnd)
          map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart, sequence = 1, t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence)
              break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index)
              parentNode.insertBefore(b[bStart++], node);
          } else
            parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else
          aStart++;
      } else
        a[aStart++].remove();
    }
  }
}
const $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init) {
  let disposer;
  createRoot((dispose) => {
    disposer = dispose;
    element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
  });
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, check, isSVG) {
  const t = document.createElement("template");
  t.innerHTML = html;
  let node = t.content.firstChild;
  if (isSVG)
    node = node.firstChild;
  return node;
}
function delegateEvents(eventNames, document2 = window.document) {
  const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document2.addEventListener(name, eventHandler);
    }
  }
}
function setAttribute(node, name, value) {
  if (value == null)
    node.removeAttribute(name);
  else
    node.setAttribute(name, value);
}
function setAttributeNS(node, namespace, name, value) {
  if (value == null)
    node.removeAttributeNS(namespace, name);
  else
    node.setAttributeNS(namespace, name, value);
}
function className(node, value) {
  if (value == null)
    node.removeAttribute("class");
  else
    node.className = value;
}
function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else
      node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, handler[0] = (e) => handlerFn.call(node, handler[1], e));
  } else
    node.addEventListener(name, handler);
}
function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}), prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key])
      continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i], classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue)
      continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}
function style(node, value, prev = {}) {
  const nodeStyle = node.style;
  const prevString = typeof prev === "string";
  if (value == null && prevString || typeof value === "string")
    return nodeStyle.cssText = value;
  prevString && (nodeStyle.cssText = void 0, prev = {});
  value || (value = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}
function spread(node, accessor, isSVG, skipChildren) {
  if (typeof accessor === "function") {
    createRenderEffect((current) => spreadExpression(node, accessor(), current, isSVG, skipChildren));
  } else
    spreadExpression(node, accessor, void 0, isSVG, skipChildren);
}
function insert(parent, accessor, marker, initial) {
  if (marker !== void 0 && !initial)
    initial = [];
  if (typeof accessor !== "function")
    return insertExpression(parent, accessor, initial, marker);
  createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
}
function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children")
        continue;
      assignProp(node, prop, null, prevProps[prop], isSVG, skipRef);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      if (!skipChildren)
        insertExpression(node, props.children);
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef);
  }
}
function hydrate$1(code, element, options = {}) {
  sharedConfig.completed = globalThis._$HY.completed;
  sharedConfig.events = globalThis._$HY.events;
  sharedConfig.load = globalThis._$HY.load;
  sharedConfig.gather = (root) => gatherHydratable(element, root);
  sharedConfig.registry = /* @__PURE__ */ new Map();
  sharedConfig.context = {
    id: options.renderId || "",
    count: 0
  };
  gatherHydratable(element, options.renderId);
  const dispose = render(code, element, [...element.childNodes]);
  sharedConfig.context = null;
  return dispose;
}
function getNextElement(template2) {
  let node, key;
  if (!sharedConfig.context || !(node = sharedConfig.registry.get(key = getHydrationKey()))) {
    return template2.cloneNode(true);
  }
  if (sharedConfig.completed)
    sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}
function getNextMarker(start) {
  let end = start, count = 0, current = [];
  if (sharedConfig.context) {
    while (end) {
      if (end.nodeType === 8) {
        const v = end.nodeValue;
        if (v === "#")
          count++;
        else if (v === "/") {
          if (count === 0)
            return [end, current];
          count--;
        }
      }
      current.push(end);
      end = end.nextSibling;
    }
  }
  return [end, current];
}
function runHydrationEvents() {
  if (sharedConfig.events && !sharedConfig.events.queued) {
    queueMicrotask(() => {
      const {
        completed,
        events
      } = sharedConfig;
      events.queued = false;
      while (events.length) {
        const [el, e] = events[0];
        if (!completed.has(el))
          return;
        eventHandler(e);
        events.shift();
      }
    });
    sharedConfig.events.queued = true;
  }
}
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}
function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
    node.classList.toggle(classNames[i], value);
}
function assignProp(node, prop, value, prev, isSVG, skipRef) {
  let isCE, isProp, isChildProp;
  if (prop === "style")
    return style(node, value, prev);
  if (prop === "classList")
    return classList(node, value, prev);
  if (value === prev)
    return prev;
  if (prop === "ref") {
    if (!skipRef) {
      value(node);
    }
  } else if (prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev);
    value && node.addEventListener(e, value);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const e = prop.slice(10);
    prev && node.removeEventListener(e, prev, true);
    value && node.addEventListener(e, value, true);
  } else if (prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if ((isChildProp = ChildProperties.has(prop)) || !isSVG && (PropAliases[prop] || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-"))) {
    if (prop === "class" || prop === "className")
      className(node, value);
    else if (isCE && !isProp && !isChildProp)
      node[toPropertyName(prop)] = value;
    else
      node[PropAliases[prop] || prop] = value;
  } else {
    const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
    if (ns)
      setAttributeNS(node, ns, prop, value);
    else
      setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
}
function eventHandler(e) {
  const key = `$$${e.type}`;
  let node = e.composedPath && e.composedPath()[0] || e.target;
  if (e.target !== node) {
    Object.defineProperty(e, "target", {
      configurable: true,
      value: node
    });
  }
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (sharedConfig.registry && !sharedConfig.done) {
    sharedConfig.done = true;
    document.querySelectorAll("[id^=pl-]").forEach((elem) => elem.remove());
  }
  while (node !== null) {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== void 0 ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble)
        return;
    }
    node = node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
  }
}
function spreadExpression(node, props, prevProps = {}, isSVG, skipChildren) {
  props || (props = {});
  if (!skipChildren && "children" in props) {
    createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
  }
  props.ref && props.ref(node);
  createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
  return prevProps;
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  if (sharedConfig.context && !current)
    current = [...parent.childNodes];
  while (typeof current === "function")
    current = current();
  if (value === current)
    return current;
  const t = typeof value, multi = marker !== void 0;
  parent = multi && current[0] && current[0].parentNode || parent;
  if (t === "string" || t === "number") {
    if (sharedConfig.context)
      return current;
    if (t === "number")
      value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else
        node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else
        current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (sharedConfig.context)
      return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function")
        v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (sharedConfig.context) {
      for (let i = 0; i < array.length; i++) {
        if (array[i].parentNode)
          return current = array;
      }
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi)
        return current;
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else
        reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value instanceof Node) {
    if (sharedConfig.context && value.parentNode)
      return current = multi ? [value] : value;
    if (Array.isArray(current)) {
      if (multi)
        return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else
      parent.replaceChild(value, parent.firstChild);
    current = value;
  } else
    ;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i], prev = current && current[i];
    if (item instanceof Node) {
      normalized.push(item);
    } else if (item == null || item === true || item === false)
      ;
    else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (typeof item === "function") {
      if (unwrap) {
        while (typeof item === "function")
          item = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], prev) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) {
        normalized.push(prev);
      } else
        normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker) {
  for (let i = 0, len = array.length; i < len; i++)
    parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === void 0)
    return parent.textContent = "";
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i)
          isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else
          isParent && el.remove();
      } else
        inserted = true;
    }
  } else
    parent.insertBefore(node, marker);
  return [node];
}
function gatherHydratable(element, root) {
  const templates = element.querySelectorAll(`*[data-hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    const key = node.getAttribute("data-hk");
    if ((!root || key.startsWith(root)) && !sharedConfig.registry.has(key))
      sharedConfig.registry.set(key, node);
  }
}
function getHydrationKey() {
  const hydrate2 = sharedConfig.context;
  return `${hydrate2.id}${hydrate2.count++}`;
}
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
function createElement(tagName, isSVG = false) {
  return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName);
}
const hydrate = (...args) => {
  enableHydration();
  return hydrate$1(...args);
};
function Dynamic(props) {
  const [p2, others] = splitProps(props, ["component"]);
  const cached = createMemo(() => p2.component);
  return createMemo(() => {
    const component = cached();
    switch (typeof component) {
      case "function":
        return untrack(() => component(others));
      case "string":
        const isSvg = SVGElements.has(component);
        const el = sharedConfig.context ? getNextElement() : createElement(component, isSvg);
        spread(el, others, isSvg);
        return el;
    }
  });
}
function bindEvent(target, type, handler) {
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}
function intercept([value, setValue], get, set) {
  return [get ? () => get(value()) : value, set ? (v) => setValue(set(v)) : setValue];
}
function querySelector(selector) {
  try {
    return document.querySelector(selector);
  } catch (e) {
    return null;
  }
}
function scrollToHash(hash, fallbackTop) {
  const el = querySelector(`#${hash}`);
  if (el) {
    el.scrollIntoView();
  } else if (fallbackTop) {
    window.scrollTo(0, 0);
  }
}
function createIntegration(get, set, init, utils) {
  let ignore = false;
  const wrap = (value) => typeof value === "string" ? { value } : value;
  const signal = intercept(createSignal(wrap(get()), { equals: (a, b) => a.value === b.value }), void 0, (next) => {
    !ignore && set(next);
    return next;
  });
  init && onCleanup(init((value = get()) => {
    ignore = true;
    signal[1](wrap(value));
    ignore = false;
  }));
  return {
    signal,
    utils
  };
}
function normalizeIntegration(integration) {
  if (!integration) {
    return {
      signal: createSignal({ value: "" })
    };
  } else if (Array.isArray(integration)) {
    return {
      signal: integration
    };
  }
  return integration;
}
function pathIntegration() {
  return createIntegration(() => ({
    value: window.location.pathname + window.location.search + window.location.hash,
    state: history.state
  }), ({ value, replace, scroll, state }) => {
    if (replace) {
      window.history.replaceState(state, "", value);
    } else {
      window.history.pushState(state, "", value);
    }
    scrollToHash(window.location.hash.slice(1), scroll);
  }, (notify) => bindEvent(window, "popstate", () => notify()), {
    go: (delta) => window.history.go(delta)
  });
}
const hasSchemeRegex = /^(?:[a-z0-9]+:)?\/\//i;
const trimPathRegex = /^\/+|\/+$/g;
function normalize(path, omitSlash = false) {
  const s = path.replace(trimPathRegex, "");
  return s ? omitSlash || /^[?#]/.test(s) ? s : "/" + s : "";
}
function resolvePath(base, path, from) {
  if (hasSchemeRegex.test(path)) {
    return void 0;
  }
  const basePath = normalize(base);
  const fromPath = from && normalize(from);
  let result = "";
  if (!fromPath || path.startsWith("/")) {
    result = basePath;
  } else if (fromPath.toLowerCase().indexOf(basePath.toLowerCase()) !== 0) {
    result = basePath + fromPath;
  } else {
    result = fromPath;
  }
  return (result || "/") + normalize(path, !result);
}
function invariant(value, message) {
  if (value == null) {
    throw new Error(message);
  }
  return value;
}
function joinPaths(from, to) {
  return normalize(from).replace(/\/*(\*.*)?$/g, "") + normalize(to);
}
function extractSearchParams(url) {
  const params = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
function urlDecode(str, isQuery) {
  return decodeURIComponent(isQuery ? str.replace(/\+/g, " ") : str);
}
function createMatcher(path, partial) {
  const [pattern, splat] = path.split("/*", 2);
  const segments = pattern.split("/").filter(Boolean);
  const len = segments.length;
  return (location) => {
    const locSegments = location.split("/").filter(Boolean);
    const lenDiff = locSegments.length - len;
    if (lenDiff < 0 || lenDiff > 0 && splat === void 0 && !partial) {
      return null;
    }
    const match = {
      path: len ? "" : "/",
      params: {}
    };
    for (let i = 0; i < len; i++) {
      const segment = segments[i];
      const locSegment = locSegments[i];
      if (segment[0] === ":") {
        match.params[segment.slice(1)] = locSegment;
      } else if (segment.localeCompare(locSegment, void 0, { sensitivity: "base" }) !== 0) {
        return null;
      }
      match.path += `/${locSegment}`;
    }
    if (splat) {
      match.params[splat] = lenDiff ? locSegments.slice(-lenDiff).join("/") : "";
    }
    return match;
  };
}
function scoreRoute(route) {
  const [pattern, splat] = route.pattern.split("/*", 2);
  const segments = pattern.split("/").filter(Boolean);
  return segments.reduce((score, segment) => score + (segment.startsWith(":") ? 2 : 3), segments.length - (splat === void 0 ? 0 : 1));
}
function createMemoObject(fn) {
  const map = /* @__PURE__ */ new Map();
  const owner = getOwner();
  return new Proxy({}, {
    get(_, property) {
      if (!map.has(property)) {
        runWithOwner(owner, () => map.set(property, createMemo(() => fn()[property])));
      }
      return map.get(property)();
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true
      };
    },
    ownKeys() {
      return Reflect.ownKeys(fn());
    }
  });
}
function expandOptionals(pattern) {
  let match = /(\/?\:[^\/]+)\?/.exec(pattern);
  if (!match)
    return [pattern];
  let prefix = pattern.slice(0, match.index);
  let suffix = pattern.slice(match.index + match[0].length);
  const prefixes = [prefix, prefix += match[1]];
  while (match = /^(\/\:[^\/]+)\?/.exec(suffix)) {
    prefixes.push(prefix += match[1]);
    suffix = suffix.slice(match[0].length);
  }
  return expandOptionals(suffix).reduce((results, expansion) => [...results, ...prefixes.map((p2) => p2 + expansion)], []);
}
const MAX_REDIRECTS = 100;
const RouterContextObj = createContext();
const RouteContextObj = createContext();
const useRouter = () => invariant(useContext(RouterContextObj), "Make sure your app is wrapped in a <Router />");
let TempRoute;
const useRoute = () => TempRoute || useContext(RouteContextObj) || useRouter().base;
const useResolvedPath = (path) => {
  const route = useRoute();
  return createMemo(() => route.resolvePath(path()));
};
const useHref = (to) => {
  const router = useRouter();
  return createMemo(() => {
    const to_ = to();
    return to_ !== void 0 ? router.renderPath(to_) : to_;
  });
};
function createRoutes(routeDef, base = "", fallback) {
  const { component, data, children: children2 } = routeDef;
  const isLeaf = !children2 || Array.isArray(children2) && !children2.length;
  const shared = {
    key: routeDef,
    element: component ? () => createComponent(component, {}) : () => {
      const { element } = routeDef;
      return element === void 0 && fallback ? createComponent(fallback, {}) : element;
    },
    preload: routeDef.component ? component.preload : routeDef.preload,
    data
  };
  return asArray(routeDef.path).reduce((acc, path) => {
    for (const originalPath of expandOptionals(path)) {
      const path2 = joinPaths(base, originalPath);
      const pattern = isLeaf ? path2 : path2.split("/*", 1)[0];
      acc.push({
        ...shared,
        originalPath,
        pattern,
        matcher: createMatcher(pattern, !isLeaf)
      });
    }
    return acc;
  }, []);
}
function createBranch(routes2, index = 0) {
  return {
    routes: routes2,
    score: scoreRoute(routes2[routes2.length - 1]) * 1e4 - index,
    matcher(location) {
      const matches = [];
      for (let i = routes2.length - 1; i >= 0; i--) {
        const route = routes2[i];
        const match = route.matcher(location);
        if (!match) {
          return null;
        }
        matches.unshift({
          ...match,
          route
        });
      }
      return matches;
    }
  };
}
function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
function createBranches(routeDef, base = "", fallback, stack = [], branches = []) {
  const routeDefs = asArray(routeDef);
  for (let i = 0, len = routeDefs.length; i < len; i++) {
    const def = routeDefs[i];
    if (def && typeof def === "object" && def.hasOwnProperty("path")) {
      const routes2 = createRoutes(def, base, fallback);
      for (const route of routes2) {
        stack.push(route);
        if (def.children) {
          createBranches(def.children, route.pattern, fallback, stack, branches);
        } else {
          const branch = createBranch([...stack], branches.length);
          branches.push(branch);
        }
        stack.pop();
      }
    }
  }
  return stack.length ? branches : branches.sort((a, b) => b.score - a.score);
}
function getRouteMatches(branches, location) {
  for (let i = 0, len = branches.length; i < len; i++) {
    const match = branches[i].matcher(location);
    if (match) {
      return match;
    }
  }
  return [];
}
function createLocation(path, state) {
  const origin = new URL("http://sar");
  const url = createMemo((prev) => {
    const path_ = path();
    try {
      return new URL(path_, origin);
    } catch (err) {
      console.error(`Invalid path ${path_}`);
      return prev;
    }
  }, origin, {
    equals: (a, b) => a.href === b.href
  });
  const pathname = createMemo(() => urlDecode(url().pathname));
  const search = createMemo(() => urlDecode(url().search, true));
  const hash = createMemo(() => urlDecode(url().hash));
  const key = createMemo(() => "");
  return {
    get pathname() {
      return pathname();
    },
    get search() {
      return search();
    },
    get hash() {
      return hash();
    },
    get state() {
      return state();
    },
    get key() {
      return key();
    },
    query: createMemoObject(on(search, () => extractSearchParams(url())))
  };
}
function createRouterContext(integration, base = "", data, out) {
  const { signal: [source, setSource], utils = {} } = normalizeIntegration(integration);
  const parsePath = utils.parsePath || ((p2) => p2);
  const renderPath = utils.renderPath || ((p2) => p2);
  const basePath = resolvePath("", base);
  const output = void 0;
  if (basePath === void 0) {
    throw new Error(`${basePath} is not a valid base path`);
  } else if (basePath && !source().value) {
    setSource({ value: basePath, replace: true, scroll: false });
  }
  const [isRouting, start] = useTransition();
  const [reference, setReference] = createSignal(source().value);
  const [state, setState] = createSignal(source().state);
  const location = createLocation(reference, state);
  const referrers = [];
  const baseRoute = {
    pattern: basePath,
    params: {},
    path: () => basePath,
    outlet: () => null,
    resolvePath(to) {
      return resolvePath(basePath, to);
    }
  };
  if (data) {
    try {
      TempRoute = baseRoute;
      baseRoute.data = data({
        data: void 0,
        params: {},
        location,
        navigate: navigatorFactory(baseRoute)
      });
    } finally {
      TempRoute = void 0;
    }
  }
  function navigateFromRoute(route, to, options) {
    untrack(() => {
      if (typeof to === "number") {
        if (!to)
          ;
        else if (utils.go) {
          utils.go(to);
        } else {
          console.warn("Router integration does not support relative routing");
        }
        return;
      }
      const { replace, resolve, scroll, state: nextState } = {
        replace: false,
        resolve: true,
        scroll: true,
        ...options
      };
      const resolvedTo = resolve ? route.resolvePath(to) : resolvePath("", to);
      if (resolvedTo === void 0) {
        throw new Error(`Path '${to}' is not a routable path`);
      } else if (referrers.length >= MAX_REDIRECTS) {
        throw new Error("Too many redirects");
      }
      const current = reference();
      if (resolvedTo !== current || nextState !== state()) {
        {
          const len = referrers.push({ value: current, replace, scroll, state: state() });
          start(() => {
            setReference(resolvedTo);
            setState(nextState);
          }).then(() => {
            if (referrers.length === len) {
              navigateEnd({
                value: resolvedTo,
                state: nextState
              });
            }
          });
        }
      }
    });
  }
  function navigatorFactory(route) {
    route = route || useContext(RouteContextObj) || baseRoute;
    return (to, options) => navigateFromRoute(route, to, options);
  }
  function navigateEnd(next) {
    const first = referrers[0];
    if (first) {
      if (next.value !== first.value || next.state !== first.state) {
        setSource({
          ...next,
          replace: first.replace,
          scroll: first.scroll
        });
      }
      referrers.length = 0;
    }
  }
  createRenderEffect(() => {
    const { value, state: state2 } = source();
    untrack(() => {
      if (value !== reference()) {
        start(() => {
          setReference(value);
          setState(state2);
        });
      }
    });
  });
  {
    let isSvg2 = function(el) {
      return el.namespaceURI === "http://www.w3.org/2000/svg";
    }, handleAnchorClick2 = function(evt) {
      if (evt.defaultPrevented || evt.button !== 0 || evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey)
        return;
      const a = evt.composedPath().find((el) => el instanceof Node && el.nodeName.toUpperCase() === "A");
      if (!a)
        return;
      const svg = isSvg2(a);
      const href = svg ? a.href.baseVal : a.href;
      const target = svg ? a.target.baseVal : a.target;
      if (target || !href && !a.hasAttribute("state"))
        return;
      const rel = (a.getAttribute("rel") || "").split(/\s+/);
      if (a.hasAttribute("download") || rel && rel.includes("external"))
        return;
      const url = svg ? new URL(href, document.baseURI) : new URL(href);
      const pathname = urlDecode(url.pathname);
      if (url.origin !== window.location.origin || basePath && pathname && !pathname.toLowerCase().startsWith(basePath.toLowerCase()))
        return;
      const to = parsePath(pathname + urlDecode(url.search, true) + urlDecode(url.hash));
      const state2 = a.getAttribute("state");
      evt.preventDefault();
      navigateFromRoute(baseRoute, to, {
        resolve: false,
        replace: a.hasAttribute("replace"),
        scroll: !a.hasAttribute("noscroll"),
        state: state2 && JSON.parse(state2)
      });
    };
    var isSvg = isSvg2, handleAnchorClick = handleAnchorClick2;
    document.addEventListener("click", handleAnchorClick2);
    onCleanup(() => document.removeEventListener("click", handleAnchorClick2));
  }
  return {
    base: baseRoute,
    out: output,
    location,
    isRouting,
    renderPath,
    parsePath,
    navigatorFactory
  };
}
function createRouteContext(router, parent, child, match) {
  const { base, location, navigatorFactory } = router;
  const { pattern, element: outlet, preload, data } = match().route;
  const path = createMemo(() => match().path);
  const params = createMemoObject(() => match().params);
  preload && preload();
  const route = {
    parent,
    pattern,
    get child() {
      return child();
    },
    path,
    params,
    data: parent.data,
    outlet,
    resolvePath(to) {
      return resolvePath(base.path(), to, path());
    }
  };
  if (data) {
    try {
      TempRoute = route;
      route.data = data({ data: parent.data, params, location, navigate: navigatorFactory(route) });
    } finally {
      TempRoute = void 0;
    }
  }
  return route;
}
const _tmpl$$4 = /* @__PURE__ */ template(`<a></a>`);
const Router = (props) => {
  const {
    source,
    url,
    base,
    data,
    out
  } = props;
  const integration = source || pathIntegration();
  const routerState = createRouterContext(integration, base, data);
  return createComponent(RouterContextObj.Provider, {
    value: routerState,
    get children() {
      return props.children;
    }
  });
};
const Routes = (props) => {
  const router = useRouter();
  const parentRoute = useRoute();
  const routeDefs = children(() => props.children);
  const branches = createMemo(() => createBranches(routeDefs(), joinPaths(parentRoute.pattern, props.base || ""), Outlet));
  const matches = createMemo(() => getRouteMatches(branches(), router.location.pathname));
  if (router.out) {
    router.out.matches.push(matches().map(({
      route,
      path,
      params
    }) => ({
      originalPath: route.originalPath,
      pattern: route.pattern,
      path,
      params
    })));
  }
  const disposers = [];
  let root;
  const routeStates = createMemo(on(matches, (nextMatches, prevMatches, prev) => {
    let equal = prevMatches && nextMatches.length === prevMatches.length;
    const next = [];
    for (let i = 0, len = nextMatches.length; i < len; i++) {
      const prevMatch = prevMatches && prevMatches[i];
      const nextMatch = nextMatches[i];
      if (prev && prevMatch && nextMatch.route.key === prevMatch.route.key) {
        next[i] = prev[i];
      } else {
        equal = false;
        if (disposers[i]) {
          disposers[i]();
        }
        createRoot((dispose) => {
          disposers[i] = dispose;
          next[i] = createRouteContext(router, next[i - 1] || parentRoute, () => routeStates()[i + 1], () => matches()[i]);
        });
      }
    }
    disposers.splice(nextMatches.length).forEach((dispose) => dispose());
    if (prev && equal) {
      return prev;
    }
    root = next[0];
    return next;
  }));
  return createComponent(Show, {
    get when() {
      return routeStates() && root;
    },
    children: (route) => createComponent(RouteContextObj.Provider, {
      value: route,
      get children() {
        return route.outlet();
      }
    })
  });
};
const useRoutes = (routes2, base) => {
  return () => createComponent(Routes, {
    base,
    children: routes2
  });
};
const Outlet = () => {
  const route = useRoute();
  return createComponent(Show, {
    get when() {
      return route.child;
    },
    children: (child) => createComponent(RouteContextObj.Provider, {
      value: child,
      get children() {
        return child.outlet();
      }
    })
  });
};
function LinkBase(props) {
  const [, rest] = splitProps(props, ["children", "to", "href", "state"]);
  const href = useHref(() => props.to);
  return (() => {
    const _el$ = getNextElement(_tmpl$$4);
    spread(_el$, rest, false, true);
    insert(_el$, () => props.children);
    createRenderEffect((_p$) => {
      const _v$ = href() || props.href, _v$2 = JSON.stringify(props.state);
      _v$ !== _p$._v$ && setAttribute(_el$, "href", _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && setAttribute(_el$, "state", _p$._v$2 = _v$2);
      return _p$;
    }, {
      _v$: void 0,
      _v$2: void 0
    });
    runHydrationEvents();
    return _el$;
  })();
}
function Link(props) {
  const to = useResolvedPath(() => props.href);
  return createComponent(LinkBase, mergeProps(props, {
    get to() {
      return to();
    }
  }));
}
var __defProp$2 = Object.defineProperty;
var __getOwnPropSymbols$2 = Object.getOwnPropertySymbols;
var __hasOwnProp$2 = Object.prototype.hasOwnProperty;
var __propIsEnum$2 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues$2 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$2.call(b, prop))
      __defNormalProp$2(a, prop, b[prop]);
  if (__getOwnPropSymbols$2)
    for (var prop of __getOwnPropSymbols$2(b)) {
      if (__propIsEnum$2.call(b, prop))
        __defNormalProp$2(a, prop, b[prop]);
    }
  return a;
};
function createSelector(styles) {
  let stringify = "";
  const stack = [__spreadValues$2({}, styles)];
  while (stack.length !== 0) {
    const node = stack.shift();
    const keys = Object.keys(node);
    const { length } = keys;
    for (let i = length - 1; i >= 0; i--) {
      const key = keys[i];
      if (typeof node[key] === "object") {
        stack.push(node[key]);
        stringify += key;
        continue;
      }
      stringify += `${key}${node[key]}`;
    }
  }
  let index = 0;
  let value = 11;
  while (index < stringify.length) {
    value = 101 * value + stringify.charCodeAt(index++) >>> 0;
  }
  return value;
}
class StyleSheet {
  constructor(options) {
    this.alreadyInsertedOrderInsensitiveRule = false;
    this.insertIndex = 0;
    this.tags = [];
    this.ssrData = "";
    this.ssrGlobalData = "";
    this.speedy = options.speedy;
    this.nonce = options.nonce;
    this.key = options.key;
    this.container = options.container;
  }
  insertTag(tag) {
    let before = null;
    if (this.tags.length !== 0) {
      before = this.tags[this.tags.length - 1].nextSibling;
    }
    this.container.insertBefore(tag, before);
    this.tags.push(tag);
  }
  insertStyle({ ruleCode, segmentRuleCode }, global2 = false) {
    if (this.container) {
      if (this.speedy) {
        const ruleIndexs = [];
        for (let index = 0; index < segmentRuleCode.length; index++) {
          ruleIndexs.push(this.insert(segmentRuleCode[index]));
        }
        return ruleIndexs;
      }
      return [this.insert(ruleCode)];
    }
    this[global2 ? "ssrGlobalData" : "ssrData"] += ruleCode;
  }
  insert(rule) {
    if (this.insertIndex % (this.speedy ? 65e3 : 1) === 0) {
      const tag2 = document.createElement("style");
      tag2.setAttribute("data-styils", this.key);
      if (this.nonce !== void 0) {
        tag2.setAttribute("nonce", this.nonce);
      }
      tag2.appendChild(document.createTextNode(""));
      this.insertTag(tag2);
    }
    const tagIndex = this.tags.length - 1;
    const tag = this.tags[tagIndex];
    let oldRule;
    if (this.speedy) {
      try {
        oldRule = { tag, index: tag.sheet.insertRule(rule, tag.sheet.cssRules.length), tagIndex };
      } catch (error) {
      }
    } else {
      tag.appendChild(document.createTextNode(rule));
      oldRule = { tag, index: tagIndex };
    }
    this.insertIndex++;
    return oldRule;
  }
  flushSingle({ tag, index }) {
    if (this.speedy) {
      tag.sheet.deleteRule(index);
    } else {
      this.container.removeChild(tag);
      this.tags.splice(index, 1);
    }
  }
  flush(type = "all") {
    this.tags.forEach((tag) => tag.parentNode && tag.parentNode.removeChild(tag));
    if (type !== "global") {
      this.ssrGlobalData = "";
    }
    this.ssrData = "";
    this.tags = [];
    this.insertIndex = 0;
  }
}
const unitProps = /* @__PURE__ */ new Set([
  "animationDelay",
  "animationDuration",
  "backgroundSize",
  "blockSize",
  "border",
  "borderBlock",
  "borderBlockEnd",
  "borderBlockEndWidth",
  "borderBlockStart",
  "borderBlockStartWidth",
  "borderBlockWidth",
  "borderBottom",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderBottomWidth",
  "borderEndEndRadius",
  "borderEndStartRadius",
  "borderInlineEnd",
  "borderInlineEndWidth",
  "borderInlineStart",
  "borderInlineStartWidth",
  "borderInlineWidth",
  "borderLeft",
  "borderLeftWidth",
  "borderRadius",
  "borderRight",
  "borderRightWidth",
  "borderSpacing",
  "borderStartEndRadius",
  "borderStartStartRadius",
  "borderTop",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderTopWidth",
  "borderWidth",
  "bottom",
  "columnGap",
  "columnRule",
  "columnRuleWidth",
  "columnWidth",
  "containIntrinsicSize",
  "flexBasis",
  "fontSize",
  "gap",
  "gridAutoColumns",
  "gridAutoRows",
  "gridTemplateColumns",
  "gridTemplateRows",
  "height",
  "inlineSize",
  "inset",
  "insetBlock",
  "insetBlockEnd",
  "insetBlockStart",
  "insetInline",
  "insetInlineEnd",
  "insetInlineStart",
  "left",
  "letterSpacing",
  "margin",
  "marginBlock",
  "marginBlockEnd",
  "marginBlockStart",
  "marginBottom",
  "marginInline",
  "marginInlineEnd",
  "marginInlineStart",
  "marginLeft",
  "marginRight",
  "marginTop",
  "maxBlockSize",
  "maxHeight",
  "maxInlineSize",
  "maxWidth",
  "minBlockSize",
  "minHeight",
  "minInlineSize",
  "minWidth",
  "offsetDistance",
  "offsetRotate",
  "outline",
  "outlineOffset",
  "outlineWidth",
  "overflowClipMargin",
  "padding",
  "paddingBlock",
  "paddingBlockEnd",
  "paddingBlockStart",
  "paddingBottom",
  "paddingInline",
  "paddingInlineEnd",
  "paddingInlineStart",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "perspective",
  "right",
  "rowGap",
  "scrollMargin",
  "scrollMarginBlock",
  "scrollMarginBlockEnd",
  "scrollMarginBlockStart",
  "scrollMarginBottom",
  "scrollMarginInline",
  "scrollMarginInlineEnd",
  "scrollMarginInlineStart",
  "scrollMarginLeft",
  "scrollMarginRight",
  "scrollMarginTop",
  "scrollPadding",
  "scrollPaddingBlock",
  "scrollPaddingBlockEnd",
  "scrollPaddingBlockStart",
  "scrollPaddingBottom",
  "scrollPaddingInline",
  "scrollPaddingInlineEnd",
  "scrollPaddingInlineStart",
  "scrollPaddingLeft",
  "scrollPaddingRight",
  "scrollPaddingTop",
  "shapeMargin",
  "textDecoration",
  "textDecorationThickness",
  "textIndent",
  "textUnderlineOffset",
  "top",
  "transitionDelay",
  "transitionDuration",
  "verticalAlign",
  "width",
  "wordSpacing"
]);
var __defProp$1 = Object.defineProperty;
var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues$1 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp$1.call(b, prop))
      __defNormalProp$1(a, prop, b[prop]);
  if (__getOwnPropSymbols$1)
    for (var prop of __getOwnPropSymbols$1(b)) {
      if (__propIsEnum$1.call(b, prop))
        __defNormalProp$1(a, prop, b[prop]);
    }
  return a;
};
const contentValuePattern = /(var|attr|counters?|url|(((repeating-)?(linear|radial))|conic)-gradient)\(|(no-)?(open|close)-quote/;
const contentValues = {
  normal: "normal",
  none: "none",
  initial: "initial",
  inherit: "inherit",
  unset: "unset"
};
function ruleToNative(key, value) {
  if (unitProps.has(key) && typeof value === "number") {
    value = `${value}px`;
  }
  key = /^--/.test(key) ? key : key.replace(/[A-Z]/g, "-$&").toLowerCase();
  if (key === "content" && !contentValuePattern.test(value) && !contentValues[value]) {
    try {
      value = JSON.stringify(value).replace(/\\\\/g, "\\");
    } catch (e) {
    }
  }
  return `${key}:${value};`;
}
function transformKey(property, selector = "") {
  if (property === ":global") {
    return "";
  }
  return selector ? selector.replace(/([^,])+/g, (sel) => {
    return property.replace(/(^:.*)|([^,])+/g, (key) => {
      return /&/.test(key) ? key.replace(/&/g, sel) : `${sel} ${key}`;
    });
  }) : property;
}
function transformSpecial(atRule, selector) {
  let blocks = "";
  let rule = "";
  const keys = Object.keys(atRule);
  const { length } = keys;
  for (let index = 0; index < length; index++) {
    const key = keys[index];
    const value = atRule[key];
    if (typeof value === "object") {
      blocks += key.charCodeAt(0) === 64 ? `${key}{${transformSpecial(value, selector)}}` : transformSpecial(value, transformKey(key, selector));
    } else if (value !== void 0) {
      rule += ruleToNative(key, value);
    }
  }
  rule = selector && rule ? `${selector}{${rule}}` : rule;
  return `${rule}${blocks}`;
}
function parseRules(node, rootSelector = "") {
  const nodes = [rootSelector];
  const stack = [__spreadValues$1({}, node)];
  const commonRules = [];
  const frontRules = [];
  const rearRules = [];
  while (stack.length) {
    const item = stack.shift();
    const selector = nodes.shift();
    const keys = Object.keys(item);
    const { length } = keys;
    let rule = "";
    let insertsNumber = 0;
    for (let num = 0; num < length; num++) {
      const key = keys[num];
      const value = item[key];
      if (key.charCodeAt(0) === 64) {
        switch (key.charCodeAt(1)) {
          case 110:
          case 105:
            frontRules.push(`${key} ${value};`);
            continue;
          case 102:
            frontRules.push(transformSpecial({ [key]: value }));
            continue;
          case 115:
          case 109:
            rearRules.push(transformSpecial({ [key]: value }, selector));
            continue;
          default:
            rearRules.push(transformSpecial({ [key]: value }));
            continue;
        }
      } else if (value !== null && typeof value === "object" && value.constructor === Object) {
        const currentKey = transformKey(key, selector);
        stack.splice(insertsNumber, 0, value);
        nodes.splice(insertsNumber, 0, currentKey);
        insertsNumber++;
      } else if (value !== void 0 && value !== null) {
        rule += ruleToNative(key, value);
      }
    }
    if (rule) {
      const block = selector ? `${selector}{${rule}}` : rule;
      commonRules.push(block);
    }
  }
  const segmentRuleCode = [.../* @__PURE__ */ new Set([...frontRules, ...commonRules, ...rearRules])];
  return {
    segmentRuleCode,
    ruleCode: segmentRuleCode.join("")
  };
}
function createBaseSystem(systemOptions, inputSystemProvider, inputStyledComponent, inputExtractElement) {
  const splitSymbol = "|";
  const isBrowser = !!globalThis.document;
  const selectorCache = /* @__PURE__ */ new Set([]);
  const globalCache = {};
  const {
    theme: inputTheme = () => ({}),
    defaultMode = "none",
    sheetOptions = {}
  } = systemOptions;
  const { key = "css", container, speedy, nonce } = sheetOptions;
  const metaSelectorCacheId = `styils-${key}-cache`;
  const metaHtml = isBrowser ? document.getElementById(metaSelectorCacheId) : null;
  const internalState = {
    mode: defaultMode,
    theme: inputTheme(defaultMode)
  };
  if (isBrowser && !selectorCache.size && metaHtml) {
    metaHtml.content.split(splitSymbol).forEach((name) => {
      selectorCache.add(name);
    });
  }
  const sheet = new StyleSheet({
    key,
    speedy: speedy === void 0 ? true : speedy,
    container: isBrowser ? container != null ? container : document.head : null,
    nonce
  });
  const SystemProvider = inputSystemProvider(internalState);
  let modeIdentifier = [];
  let withIndex = 0;
  const styled2 = (tag, styles, interpolation) => {
    var _a;
    let inputTag = tag;
    const inputNamespace = (_a = tag.namespace) != null ? _a : "";
    if (typeof tag === "object" && tag.tag) {
      inputTag = tag.tag;
    }
    const currentWithIndex = withIndex;
    const targetInfo = {
      targetClassName: "",
      namespaceJoiner: ""
    };
    function createRule() {
      var _a2;
      const identifier = (_a2 = modeIdentifier[currentWithIndex]) == null ? void 0 : _a2[internalState.mode];
      if (identifier) {
        const { namespaceJoiner: namespaceJoiner2, targetClassName: targetClassName2 } = identifier;
        targetInfo.namespaceJoiner = namespaceJoiner2;
        targetInfo.targetClassName = targetClassName2;
        return;
      }
      const style2 = typeof styles === "function" ? styles(internalState.theme, internalState.mode) : styles;
      const variants = typeof interpolation === "function" ? interpolation(internalState.theme, internalState.mode) : interpolation;
      const selector = `${key}-${createSelector(style2)}`;
      let targetClassName = selector;
      let namespaceJoiner = "";
      if (inputNamespace) {
        targetClassName = `${inputNamespace}-${selector}`;
        namespaceJoiner = `${inputNamespace}-`;
      }
      const rules = {
        segmentRuleCode: [],
        ruleCode: ""
      };
      if (!selectorCache.has(targetClassName)) {
        selectorCache.add(targetClassName);
        const { segmentRuleCode, ruleCode } = parseRules(style2, `.${targetClassName}`);
        rules.ruleCode = ruleCode;
        rules.segmentRuleCode = segmentRuleCode;
      }
      if (variants) {
        const variantsKeys = Object.keys(variants);
        let variantsIndex = variantsKeys.length;
        while (variantsIndex--) {
          const variantsKey = variantsKeys[variantsIndex];
          const variantsValue = variants[variantsKey];
          const variantsChildKeys = Object.keys(variantsValue);
          let variantsChildIndex = variantsChildKeys.length;
          while (variantsChildIndex--) {
            const key2 = variantsChildKeys[variantsChildIndex];
            const value = variantsValue[key2];
            const variantsClassName = `${targetClassName}.${namespaceJoiner}${variantsKey}-${key2}`;
            if (!selectorCache.has(variantsClassName)) {
              selectorCache.add(variantsClassName);
              const { segmentRuleCode, ruleCode } = parseRules(value, `.${variantsClassName}`);
              rules.ruleCode += ruleCode;
              rules.segmentRuleCode.push(...segmentRuleCode);
            }
          }
        }
      }
      if (rules.ruleCode || rules.segmentRuleCode.length) {
        sheet.insertStyle(rules);
      }
      targetInfo.targetClassName = targetClassName;
      targetInfo.namespaceJoiner = namespaceJoiner;
      if (!modeIdentifier[currentWithIndex]) {
        modeIdentifier[currentWithIndex] = {};
      }
      modeIdentifier[currentWithIndex][internalState.mode] = {
        targetClassName,
        namespaceJoiner
      };
      withIndex++;
    }
    function computedVariants(variants) {
      const variantsPropsKeys = Object.keys(variants);
      let variantsPropsIndex = variantsPropsKeys.length;
      let variantsClassName = "";
      while (variantsPropsIndex--) {
        const key2 = variantsPropsKeys[variantsPropsIndex];
        const value = variants[key2];
        if (value !== void 0 && value !== null) {
          variantsClassName = ` ${targetInfo.namespaceJoiner}${key2}-${value}`;
        }
      }
      return variantsClassName;
    }
    createRule();
    const styledComponent = inputStyledComponent(inputTag, createRule, computedVariants, targetInfo);
    Object.defineProperty(styledComponent, "toString", {
      value() {
        createRule();
        return `.${targetInfo.targetClassName}`;
      }
    });
    return styledComponent;
  };
  function createExtracts2() {
    var _a, _b, _c;
    const globalStyleSSRId = `styils-${key}-ssr-global`;
    const styleSSRId = `styils-${key}-ssr`;
    const styleHtml = isBrowser ? document.getElementById(styleSSRId) : null;
    const styleGlobalHtml = isBrowser ? document.getElementById(globalStyleSSRId) : null;
    const ssrGlobalData = sheet.ssrGlobalData || ((_a = styleGlobalHtml == null ? void 0 : styleGlobalHtml.textContent) != null ? _a : "");
    const ssrData = sheet.ssrData || ((_b = styleHtml == null ? void 0 : styleHtml.textContent) != null ? _b : "");
    const metaMode = (metaHtml == null ? void 0 : metaHtml.getAttribute("mode")) || internalState.mode;
    const selectorCacheString = (_c = metaHtml == null ? void 0 : metaHtml.content) != null ? _c : [...selectorCache].join(splitSymbol);
    const extractHtml = `<meta id="${metaSelectorCacheId}" name="styils-cache" mode="${metaMode}" content="${selectorCacheString}">
     <style id="${globalStyleSSRId}">${ssrGlobalData}</style>
     <style id="${styleSSRId}">${ssrData}</style>`;
    const extractElement = inputExtractElement({
      selectorCacheString,
      metaSelectorCacheId,
      globalStyleSSRId,
      ssrGlobalData,
      styleSSRId,
      ssrData,
      metaMode
    });
    return { extractHtml, extractElement };
  }
  const keyframes2 = (style2) => {
    const selector = `${key}-${createSelector(style2)}`;
    if (!selectorCache.has(selector)) {
      selectorCache.add(selector);
      const rules = parseRules({ [`@keyframes ${selector}`]: style2 });
      sheet.insertStyle(rules, true);
    }
    return selector;
  };
  const global2 = (styles) => {
    let oldRule;
    function createGlobRules() {
      if (oldRule) {
        const tagIndex = [];
        oldRule.forEach((rule) => {
          if (!tagIndex[rule.tagIndex])
            tagIndex[rule.tagIndex] = 0;
          sheet.flushSingle({
            tag: rule.tag,
            index: sheet.speedy ? rule.index - tagIndex[rule.tagIndex] : rule.index
          });
          tagIndex[rule.tagIndex]++;
        });
        oldRule = void 0;
      }
      if (isBrowser && metaHtml && internalState.mode === metaHtml.getAttribute("mode")) {
        return;
      }
      let rules;
      const cache = globalCache[internalState.mode];
      if (globalCache[internalState.mode]) {
        rules = cache;
      } else {
        const style2 = typeof styles === "function" ? styles(internalState.theme, internalState.mode) : styles;
        rules = parseRules(style2);
        globalCache[internalState.mode] = rules;
      }
      oldRule = sheet.insertStyle(rules, true);
    }
    createGlobRules();
    Object.defineProperty(internalState, "mode", {
      set(value) {
        this.value = value;
        createGlobRules();
      },
      get() {
        var _a;
        return (_a = this.value) != null ? _a : defaultMode;
      }
    });
  };
  function flush2(type = "all") {
    sheet.flush(type);
    selectorCache.clear();
    modeIdentifier = [];
  }
  return { styled: styled2, SystemProvider, createExtracts: createExtracts2, flush: flush2, global: global2, keyframes: keyframes2 };
}
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
function createSystem(options = {}) {
  const themeContent = createContext(
    {}
  );
  const useSystem = () => useContext(themeContent);
  const SystemProvider = (providerOptions) => (props) => {
    const [mode, setMode] = createSignal(providerOptions.mode);
    const [theme, setTheme] = createSignal(providerOptions.theme);
    const updataMode = (value) => {
      providerOptions.theme = options.theme(value);
      providerOptions.mode = value;
      batch(() => {
        setMode(providerOptions.mode);
        setTheme(providerOptions.theme);
      });
    };
    return createComponent(themeContent.Provider, {
      value: {
        theme,
        setMode: updataMode,
        mode
      },
      get children() {
        return props.children;
      }
    });
  };
  const styledComponent = (inputTag, createRule, computedVariants, targetInfo) => (inputProps) => {
    const [props, rest] = splitProps(mergeProps({ as: inputTag }, inputProps), [
      "as",
      "class",
      "variants"
    ]);
    const { mode } = useSystem();
    const classes = createMemo(() => {
      if ((mode == null ? void 0 : mode()) !== void 0) {
        createRule();
      }
      const variantsClassName = props.variants ? computedVariants(props.variants) : "";
      return `${props.class ? props.class + " " : ""}${targetInfo.targetClassName}${variantsClassName}`;
    });
    return Dynamic(__spreadValues({
      get component() {
        return props.as;
      },
      get class() {
        return classes();
      }
    }, rest));
  };
  const extractElement = ({
    metaSelectorCacheId,
    selectorCacheString,
    globalStyleSSRId,
    ssrGlobalData,
    styleSSRId,
    ssrData,
    metaMode
  }) => [
    Dynamic({
      component: "meta",
      id: metaSelectorCacheId,
      name: "styils-cache",
      mode: metaMode,
      content: selectorCacheString
    }),
    Dynamic({
      component: "style",
      id: globalStyleSSRId,
      children: ssrGlobalData
    }),
    Dynamic({
      component: "style",
      id: styleSSRId,
      children: ssrData
    })
  ];
  return __spreadProps(__spreadValues({}, createBaseSystem(options, SystemProvider, styledComponent, extractElement)), {
    useSystem
  });
}
const { styled, createExtracts, flush, global, keyframes } = createSystem();
const _tmpl$$3 = /* @__PURE__ */ template(`<div>hello as</div>`), _tmpl$2$3 = /* @__PURE__ */ template(`<h3>Home!</h3>`), _tmpl$3$2 = /* @__PURE__ */ template(`<span>Click on links to navigate</span>`);
const Button$2 = styled("button", {
  color: "#999"
});
function AA$1() {
  return getNextElement(_tmpl$$3);
}
const Home = () => {
  return [getNextElement(_tmpl$2$3), createComponent(AA$1, {}), createComponent(Button$2, {
    children: "hello home"
  }), getNextElement(_tmpl$3$2)];
};
const _tmpl$$2 = /* @__PURE__ */ template(`<h3>Count!</h3>`), _tmpl$2$2 = /* @__PURE__ */ template(`<button>+</button>`), _tmpl$3$1 = /* @__PURE__ */ template(`<div></div>`), _tmpl$4 = /* @__PURE__ */ template(`<button>-</button>`);
const Button$1 = styled("button", {
  color: "blue"
});
const Counter = () => {
  const [count, setCount] = createSignal(0);
  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);
  return [getNextElement(_tmpl$$2), createComponent(Button$1, {
    children: "hello counter"
  }), (() => {
    const _el$2 = getNextElement(_tmpl$2$2);
    _el$2.$$click = increment;
    runHydrationEvents();
    return _el$2;
  })(), (() => {
    const _el$3 = getNextElement(_tmpl$3$1);
    insert(_el$3, count);
    return _el$3;
  })(), (() => {
    const _el$4 = getNextElement(_tmpl$4);
    _el$4.$$click = decrement;
    runHydrationEvents();
    return _el$4;
  })()];
};
delegateEvents(["click"]);
const _tmpl$$1 = /* @__PURE__ */ template(`<div>hello as</div>`), _tmpl$2$1 = /* @__PURE__ */ template(`<h3>About</h3>`), _tmpl$3 = /* @__PURE__ */ template(`<span>Time on page: <!#><!/>sec</span>`);
const Button = styled("button", {
  color: "red"
});
function AA() {
  return getNextElement(_tmpl$$1);
}
const About = () => {
  const [count, setCount] = createSignal(0);
  let interval = null;
  onMount(() => {
    interval = setInterval(() => setCount(count() + 1), 1e3);
  });
  onCleanup(() => {
    clearInterval(interval);
  });
  return [getNextElement(_tmpl$2$1), createComponent(Button, {
    children: "hello about"
  }), createComponent(AA, {}), (() => {
    const _el$3 = getNextElement(_tmpl$3), _el$4 = _el$3.firstChild, _el$6 = _el$4.nextSibling, [_el$7, _co$] = getNextMarker(_el$6.nextSibling);
    _el$7.nextSibling;
    insert(_el$3, count, _el$7, _co$);
    return _el$3;
  })()];
};
const routes = [
  {
    path: "/",
    component: Home
  },
  {
    path: "/counter",
    component: Counter
  },
  {
    path: "/about",
    component: About
  }
];
const _tmpl$ = /* @__PURE__ */ template(`<h2>Hi from SolidJS + Vite + SSR!</h2>`), _tmpl$2 = /* @__PURE__ */ template(`<nav><!#><!/><!#><!/><!#><!/></nav>`);
const App = () => {
  const Routes2 = useRoutes(routes);
  return [getNextElement(_tmpl$), (() => {
    const _el$2 = getNextElement(_tmpl$2), _el$3 = _el$2.firstChild, [_el$4, _co$] = getNextMarker(_el$3.nextSibling), _el$5 = _el$4.nextSibling, [_el$6, _co$2] = getNextMarker(_el$5.nextSibling), _el$7 = _el$6.nextSibling, [_el$8, _co$3] = getNextMarker(_el$7.nextSibling);
    _el$2.style.setProperty("display", "flex");
    _el$2.style.setProperty("column-gap", "15px");
    insert(_el$2, createComponent(Link, {
      href: "/",
      children: "Home"
    }), _el$4, _co$);
    insert(_el$2, createComponent(Link, {
      href: "/counter",
      children: "Counter"
    }), _el$6, _co$2);
    insert(_el$2, createComponent(Link, {
      href: "/about",
      children: "About"
    }), _el$8, _co$3);
    return _el$2;
  })(), createComponent(Routes2, {})];
};
hydrate(() => createComponent(Router, {
  get children() {
    return createComponent(App, {});
  }
}), document.getElementById("root"));
