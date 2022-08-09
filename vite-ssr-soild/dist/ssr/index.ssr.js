import { isServer, createComponent as createComponent$1, mergeProps, ssr, ssrHydrationKey, ssrSpread, ssrAttribute, escape, Dynamic, generateHydrationScript, renderToString } from "solid-js/web";
import { createSignal, onCleanup, getOwner, runWithOwner, createMemo, createContext, useTransition, useContext, createRenderEffect, untrack, on, resetErrorBoundaries, createComponent, splitProps, children, createRoot, Show, batch, mergeProps as mergeProps$1, onMount } from "solid-js";
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
function staticIntegration(obj) {
  return {
    signal: [() => obj, (next) => Object.assign(obj, next)]
  };
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
  return expandOptionals(suffix).reduce((results, expansion) => [...results, ...prefixes.map((p) => p + expansion)], []);
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
  const parsePath = utils.parsePath || ((p) => p);
  const renderPath = utils.renderPath || ((p) => p);
  const basePath = resolvePath("", base);
  const output = isServer && out ? Object.assign(out, {
    matches: [],
    url: void 0
  }) : void 0;
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
        if (isServer) {
          if (output) {
            output.url = resolvedTo;
          }
          setSource({ value: resolvedTo, replace, scroll, state: nextState });
        } else {
          const len = referrers.push({ value: current, replace, scroll, state: state() });
          start(() => {
            setReference(resolvedTo);
            setState(nextState);
            resetErrorBoundaries();
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
  if (!isServer) {
    let isSvg = function(el) {
      return el.namespaceURI === "http://www.w3.org/2000/svg";
    }, handleAnchorClick = function(evt) {
      if (evt.defaultPrevented || evt.button !== 0 || evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey)
        return;
      const a = evt.composedPath().find((el) => el instanceof Node && el.nodeName.toUpperCase() === "A");
      if (!a)
        return;
      const svg = isSvg(a);
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
    document.addEventListener("click", handleAnchorClick);
    onCleanup(() => document.removeEventListener("click", handleAnchorClick));
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
const _tmpl$$4 = ["<a", " ", ">", "</a>"];
const Router = (props) => {
  const {
    source,
    url,
    base,
    data,
    out
  } = props;
  const integration = source || (isServer ? staticIntegration({
    value: url || ""
  }) : pathIntegration());
  const routerState = createRouterContext(integration, base, data, out);
  return createComponent$1(RouterContextObj.Provider, {
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
  return createComponent$1(Show, {
    get when() {
      return routeStates() && root;
    },
    children: (route) => createComponent$1(RouteContextObj.Provider, {
      value: route,
      get children() {
        return route.outlet();
      }
    })
  });
};
const useRoutes = (routes2, base) => {
  return () => createComponent$1(Routes, {
    base,
    children: routes2
  });
};
const Outlet = () => {
  const route = useRoute();
  return createComponent$1(Show, {
    get when() {
      return route.child;
    },
    children: (child) => createComponent$1(RouteContextObj.Provider, {
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
  return ssr(_tmpl$$4, ssrHydrationKey(), ssrSpread(rest, false, true) + ssrAttribute("href", escape(href(), true) || escape(props.href, true), false) + ssrAttribute("state", escape(JSON.stringify(props.state), true), false), escape(props.children));
}
function Link(props) {
  const to = useResolvedPath(() => props.href);
  return createComponent$1(LinkBase, mergeProps(props, {
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
    if (process.env.NODE_ENV !== "production") {
      const isImportRule = rule.charCodeAt(0) === 64 && rule.charCodeAt(1) === 105;
      if (isImportRule && this.alreadyInsertedOrderInsensitiveRule) {
        console.error(
          [
            `You're attempting to insert the following rule:
${rule}

`,
            "`@import` rules must be before all other types of rules in a stylesheet but other rules have already been inserted.",
            "Please ensure that `@import` rules are before all other rules."
          ].join("")
        );
      }
      this.alreadyInsertedOrderInsensitiveRule = this.alreadyInsertedOrderInsensitiveRule || !isImportRule;
    }
    let oldRule;
    if (this.speedy) {
      try {
        oldRule = { tag, index: tag.sheet.insertRule(rule, tag.sheet.cssRules.length), tagIndex };
      } catch (error) {
        if (process.env.NODE_ENV !== "production" && !/:(-moz-placeholder|-moz-focus-inner|-moz-focusring|-ms-input-placeholder|-moz-read-write|-moz-read-only|-ms-clear){/.test(
          rule
        )) {
          console.error(
            `There was a problem inserting the following rule: "${rule}"`,
            error == null ? void 0 : error.message
          );
        }
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
    if (process.env.NODE_ENV !== "production") {
      this.alreadyInsertedOrderInsensitiveRule = false;
    }
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
    speedy: speedy === void 0 ? process.env.NODE_ENV === "production" : speedy,
    container: isBrowser ? container != null ? container : document.head : null,
    nonce
  });
  const SystemProvider = inputSystemProvider(internalState);
  let modeIdentifier = [];
  let withIndex = 0;
  const styled2 = (tag, styles, interpolation) => {
    var _a, _b;
    let inputTag = tag;
    let cacheSourceMap = "";
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
      const style = typeof styles === "function" ? styles(internalState.theme, internalState.mode) : styles;
      const variants = typeof interpolation === "function" ? interpolation(internalState.theme, internalState.mode) : interpolation;
      const selector = `${key}-${createSelector(style)}`;
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
        const { segmentRuleCode, ruleCode } = parseRules(style, `.${targetClassName}`);
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
      if (process.env.NODE_ENV !== "production") {
        if (!cacheSourceMap && styled2.sourceMap) {
          cacheSourceMap = styled2.sourceMap;
          delete styled2.sourceMap;
        }
        if (rules.ruleCode) {
          rules.ruleCode += cacheSourceMap;
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
    if (process.env.NODE_ENV !== "production") {
      styledComponent.displayName = (_b = styledComponent.displayName) != null ? _b : targetInfo.targetClassName;
    }
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
  const keyframes2 = (style) => {
    const selector = `${key}-${createSelector(style)}`;
    if (!selectorCache.has(selector)) {
      selectorCache.add(selector);
      const rules = parseRules({ [`@keyframes ${selector}`]: style });
      sheet.insertStyle(rules, true);
    }
    return selector;
  };
  const global2 = (styles) => {
    let oldRule;
    let cacheSourceMap = "";
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
        const style = typeof styles === "function" ? styles(internalState.theme, internalState.mode) : styles;
        rules = parseRules(style);
        globalCache[internalState.mode] = rules;
      }
      if (process.env.NODE_ENV !== "production") {
        if (!cacheSourceMap && global2.sourceMap) {
          cacheSourceMap = global2.sourceMap;
          delete global2.sourceMap;
        }
        rules.ruleCode += cacheSourceMap;
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
    const [props, rest] = splitProps(mergeProps$1({ as: inputTag }, inputProps), [
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
const _tmpl$$3 = ["<div", ">hello as</div>"], _tmpl$2$3 = ["<h3", ">Home!</h3>"], _tmpl$3$2 = ["<span", ">Click on links to navigate</span>"];
const Button$2 = styled("button", {
  color: "#999"
});
function AA$1() {
  return ssr(_tmpl$$3, ssrHydrationKey());
}
const Home = () => {
  return [ssr(_tmpl$2$3, ssrHydrationKey()), createComponent$1(AA$1, {}), createComponent$1(Button$2, {
    children: "hello home"
  }), ssr(_tmpl$3$2, ssrHydrationKey())];
};
const _tmpl$$2 = ["<h3", ">Count!</h3>"], _tmpl$2$2 = ["<button", ">+</button>"], _tmpl$3$1 = ["<div", ">", "</div>"], _tmpl$4 = ["<button", ">-</button>"];
const Button$1 = styled("button", {
  color: "blue"
});
const Counter = () => {
  const [count, setCount] = createSignal(0);
  return [ssr(_tmpl$$2, ssrHydrationKey()), createComponent$1(Button$1, {
    children: "hello counter"
  }), ssr(_tmpl$2$2, ssrHydrationKey()), ssr(_tmpl$3$1, ssrHydrationKey(), escape(count())), ssr(_tmpl$4, ssrHydrationKey())];
};
const _tmpl$$1 = ["<div", ">hello as</div>"], _tmpl$2$1 = ["<h3", ">About</h3>"], _tmpl$3 = ["<span", ">Time on page: <!--#-->", "<!--/-->sec</span>"];
const Button = styled("button", {
  color: "red"
});
function AA() {
  return ssr(_tmpl$$1, ssrHydrationKey());
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
  return [ssr(_tmpl$2$1, ssrHydrationKey()), createComponent$1(Button, {
    children: "hello about"
  }), createComponent$1(AA, {}), ssr(_tmpl$3, ssrHydrationKey(), escape(count()))];
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
const _tmpl$ = ["<h2", ">Hi from SolidJS + Vite + SSR!</h2>"], _tmpl$2 = ["<nav", ' style="', '"><!--#-->', "<!--/--><!--#-->", "<!--/--><!--#-->", "<!--/--></nav>"];
const App = () => {
  const Routes2 = useRoutes(routes);
  return [ssr(_tmpl$, ssrHydrationKey()), ssr(_tmpl$2, ssrHydrationKey(), "display:flex;column-gap:15px", escape(createComponent$1(Link, {
    href: "/",
    children: "Home"
  })), escape(createComponent$1(Link, {
    href: "/counter",
    children: "Counter"
  })), escape(createComponent$1(Link, {
    href: "/about",
    children: "About"
  }))), createComponent$1(Routes2, {})];
};
function render(url) {
  const appHtml = renderToString(() => createComponent$1(Router, {
    url,
    get children() {
      return createComponent$1(App, {});
    }
  }));
  const {
    extractHtml
  } = createExtracts();
  return {
    appHtml,
    extractHtml
  };
}
const hydrationScript = generateHydrationScript();
const clientRoutes = routes.map(({
  path
}) => path);
export {
  clientRoutes,
  hydrationScript,
  render
};
