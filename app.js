'use strict';
(function(){
const { useState, useEffect, useMemo, useRef } = React;
const h = React.createElement;

// =============== CONSTANTS ===============
const PLATFORMS = ['Apple TV','Google TV','Netflix','Disney+','극장 관람','기타'];
const DECADES = [1970, 1980, 1990, 2000, 2010, 2020];
const TMDB_MOVIE_GENRES = {
  28:'액션', 12:'모험', 16:'애니메이션', 35:'코미디', 80:'범죄', 99:'다큐멘터리',
  18:'드라마', 10751:'가족', 14:'판타지', 36:'역사', 27:'공포', 10402:'음악',
  9648:'미스터리', 10749:'로맨스', 878:'SF', 10770:'TV영화', 53:'스릴러',
  10752:'전쟁', 37:'서부'
};
const TMDB_TV_GENRES = {
  10759:'액션/모험', 16:'애니메이션', 35:'코미디', 80:'범죄', 99:'다큐멘터리',
  18:'드라마', 10751:'가족', 10762:'키즈', 9648:'미스터리', 10763:'뉴스',
  10764:'리얼리티', 10765:'SF/판타지', 10766:'드라마(연속극)', 10767:'토크쇼',
  10768:'전쟁/정치', 37:'서부'
};
const SORT_OPTIONS = [
  ['recent', '최근 관람순'],
  ['rating', '평점 높은순'],
  ['title', '제목순'],
  ['year', '개봉연도순'],
  ['runtime', '러닝타임순'],
  ['random', '랜덤']
];
const TV_SORT_OPTIONS = [
  ['recent', '최근 관람순'],
  ['rating', '평점 높은순'],
  ['title', '제목순'],
  ['year', '방영연도순'],
  ['random', '랜덤']
];
const PER_PAGE = 20;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';
const POSTER_BIG = 'https://image.tmdb.org/t/p/w342';

// =============== STORAGE ===============
function LS(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch(e) { return def; }
}
function SS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch(e) { return false; }
}
function migrate(ud) {
  ud = ud || {};
  if (!ud.w) ud.w = {};
  if (!ud.r) ud.r = {};
  if (!ud.c) ud.c = [];
  if (!ud.n) ud.n = {};
  if (!ud.edits) ud.edits = {};
  if (!ud.h) ud.h = [];
  if (!ud.po) ud.po = {};
  if (!ud.tv) ud.tv = [];
  if (!ud.tvw) ud.tvw = {};
  if (!ud.tvr) ud.tvr = {};
  if (!ud.tvn) ud.tvn = {};
  if (!ud.tvh) ud.tvh = [];
  return ud;
}

// =============== UTIL ===============
function todayStr(){ const d=new Date(); return d.toISOString().slice(0,10); }
function fmt(min){ if(!min) return '-'; const h=Math.floor(min/60), m=min%60; return h?`${h}시간 ${m}분`:`${m}분`; }
function totalMin(arr){ return (arr||[]).reduce((s,v)=>s+(v||0),0); }
function chosung(str){
  const cho=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let result = '';
  for (let ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      result += cho[Math.floor((code - 0xAC00) / 588)];
    } else result += ch;
  }
  return result;
}

// =============== TMDB SEARCH (Movie) ===============
async function searchTMDBMovie(apiKey, query) {
  if (!apiKey || !query || query.length < 2) return [];
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ko-KR`;
    const r = await fetch(url);
    const data = await r.json();
    return (data.results || []).slice(0, 10);
  } catch(e) { return []; }
}
async function searchTMDBTv(apiKey, query) {
  if (!apiKey || !query || query.length < 2) return [];
  try {
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ko-KR`;
    const r = await fetch(url);
    const data = await r.json();
    return (data.results || []).slice(0, 10);
  } catch(e) { return []; }
}
async function fetchMovieDetail(apiKey, id) {
  if (!apiKey || !id) return null;
  try {
    const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=ko-KR&append_to_response=credits`;
    const r = await fetch(url);
    return await r.json();
  } catch(e) { return null; }
}
async function fetchTvDetail(apiKey, id) {
  if (!apiKey || !id) return null;
  try {
    const url = `https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}&language=ko-KR&append_to_response=credits`;
    const r = await fetch(url);
    return await r.json();
  } catch(e) { return null; }
}

// =============== STABLE COMPONENTS ===============

// Modal - defined OUTSIDE App so re-renders don't recreate it.
// This is the key fix for the "keyboard drops" bug.
function PModal({show, onClose, children, title}) {
  useEffect(() => {
    if (show) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [show]);
  if (!show) return null;
  return h('div', {
    className: 'modal-bg',
    onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
  },
    h('div', { className: 'modal' },
      h('div', { className: 'modal-handle' }),
      h('button', { className: 'modal-close', onClick: onClose }, '✕'),
      title && h('h2', null, title),
      children
    )
  );
}

function StarRating({value, onChange}) {
  return h('div', { className: 'star-rating' },
    [1,2,3,4,5].map(n => h('button', {
      key: n,
      className: n <= value ? 'on' : '',
      onClick: () => onChange(n === value ? 0 : n)
    }, '★')),
    h('span', { className: 'rating-val' }, value > 0 ? `${value}.0` : '')
  );
}

function MovieCard({m, watched, rating, lastDate, onClick}) {
  const posterUrl = m.po;
  return h('div', { className: 'card', onClick },
    h('div', { className: 'poster' + (watched ? ' watched' : '') },
      posterUrl
        ? h('img', { src: posterUrl, alt: m.t, loading: 'lazy' })
        : h('div', { className: 'poster-ph' }, '🎬')
    ),
    h('div', { className: 'card-body' },
      h('div', { className: 'card-title' }, m.t),
      m.e && h('div', { className: 'card-eng' }, m.e),
      h('div', { className: 'card-meta' },
        [m.y, m.g, m.d, fmt(m.m)].filter(Boolean).join(' · ')
      ),
      h('div', { className: 'card-rating' },
        rating > 0 && h('span', { className: 'stars' }, '★'.repeat(rating)),
        lastDate && h('span', { style: { fontSize: 11, color: 'var(--text-3)' } }, lastDate),
        h('span', { className: 'platform' }, m.p)
      )
    )
  );
}

function GridCard({m, watched, onClick}) {
  return h('div', { className: 'gcard', onClick },
    h('div', { className: 'gposter' + (watched ? ' watched' : '') },
      m.po
        ? h('img', { src: m.po, alt: m.t, loading: 'lazy' })
        : h('div', { className: 'gp-ph' }, '🎬')
    ),
    h('div', { className: 'gtitle' }, m.t)
  );
}

function DramaCard({d, rating, progress, onClick}) {
  // progress: { done: number, total: number, watched: bool }
  return h('div', { className: 'card', onClick },
    h('div', { className: 'poster' + (progress.watched ? ' watched' : '') },
      d.po
        ? h('img', { src: d.po, alt: d.t, loading: 'lazy' })
        : h('div', { className: 'poster-ph' }, '📺')
    ),
    h('div', { className: 'card-body' },
      h('div', { className: 'card-title' }, d.t),
      d.e && h('div', { className: 'card-eng' }, d.e),
      h('div', { className: 'card-meta' },
        [d.y + (d.ey && d.ey !== d.y ? `~${d.ey}` : ''), d.g, d.d].filter(Boolean).join(' · ')
      ),
      progress.total > 0 && h('div', { className: 'card-progress' },
        `시즌 ${progress.done}/${progress.total}` + (progress.epProgress ? ` · ${progress.epProgress}` : '')
      ),
      h('div', { className: 'card-rating' },
        rating > 0 && h('span', { className: 'stars' }, '★'.repeat(rating)),
        h('span', { className: 'platform' }, d.p)
      )
    )
  );
}

// =============== MOUNT (App is defined in app-main.js) ===============
window.PENSIEVE = {
  PLATFORMS, DECADES, TMDB_MOVIE_GENRES, TMDB_TV_GENRES,
  SORT_OPTIONS, TV_SORT_OPTIONS, PER_PAGE, POSTER_BASE, POSTER_BIG,
  LS, SS, migrate, todayStr, fmt, totalMin, chosung,
  searchTMDBMovie, searchTMDBTv, fetchMovieDetail, fetchTvDetail,
  PModal, StarRating, MovieCard, GridCard, DramaCard,
  h, React, useState, useEffect, useMemo, useRef
};
})();
