/* Theme override (light/dark/system). Stored per browser, not in the progress file. */
(function () {
  'use strict';
  var KEY = 'biomechprimer.theme';
  function get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function apply(v) {
    if (v) document.documentElement.setAttribute('data-theme', v);
    else document.documentElement.removeAttribute('data-theme');
  }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } apply(v); }
  apply(get());
  window.BP = window.BP || {};
  window.BP.theme = { get: get, set: set };
})();
