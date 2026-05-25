'use strict';
(function(){
const P = window.PENSIEVE;
const { h, React, useState, useEffect, useMemo, useRef } = P;
const { PModal, StarRating, MovieCard, GridCard, DramaCard } = P;
const { LS, SS, migrate, todayStr, fmt, totalMin, chosung } = P;
const { PLATFORMS, DECADES, TMDB_MOVIE_GENRES, TMDB_TV_GENRES } = P;
const { SORT_OPTIONS, TV_SORT_OPTIONS, PER_PAGE, POSTER_BASE } = P;
const { searchTMDBMovie, searchTMDBTv, fetchMovieDetail, fetchTvDetail } = P;

// =============== MOVIE FORM (ADD/EDIT) ===============
function MovieForm({initial, onSave, onCancel, apiKey}) {
  const [form, setForm] = useState(initial || { t:'', e:'', y:'', m:'', g:'', d:'', s:'', p:'기타', po:'' });
  const [tmdbResults, setTmdbResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!form.t || form.t.length < 2 || searching) return;
    setTmdbResults([]);
    setSearching(true);
    const results = await searchTMDBMovie(apiKey, form.t);
    setTmdbResults(results);
    setSearching(false);
  };

  const pickTMDB = async (item) => {
    setTmdbResults([]);
    setSearching(true);
    const detail = await fetchMovieDetail(apiKey, item.id);
    setSearching(false);
    if (!detail) return;
    const director = (detail.credits?.crew || []).find(c => c.job === 'Director');
    const genres = (detail.genres || []).map(g => g.name).slice(0, 2).join('/');
    setForm({
      ...form,
      t: detail.title || form.t,
      e: detail.original_title || '',
      y: detail.release_date ? parseInt(detail.release_date.slice(0,4)) : '',
      m: detail.runtime || '',
      g: genres,
      d: director ? director.name : '',
      po: detail.poster_path ? POSTER_BASE + detail.poster_path : ''
    });
  };

  const save = () => {
    if (!form.t.trim()) { alert('제목을 입력하세요'); return; }
    onSave({
      ...form,
      y: form.y ? parseInt(form.y) : 0,
      m: form.m ? parseInt(form.m) : 0,
      t: form.t.trim()
    });
  };

  return h('div', null,
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '한글 제목 *'),
      h('input', { className: 'form-input', value: form.t, onChange: e => setForm({...form, t: e.target.value}), placeholder: '영화 제목' }),
      apiKey && h('button', {
        className: 'btn-search',
        disabled: searching || !form.t || form.t.length < 2,
        onClick: search
      }, searching ? '검색 중...' : '🔍 TMDB에서 검색'),
      tmdbResults.length > 0 && h('div', { className: 'tmdb-results' },
        tmdbResults.map(r => h('div', {
          key: r.id, className: 'tmdb-item', onClick: () => pickTMDB(r)
        },
          h('div', { className: 'tmdb-thumb' },
            r.poster_path && h('img', { src: POSTER_BASE + r.poster_path, loading: 'lazy' })
          ),
          h('div', { className: 'tmdb-info' },
            h('div', { className: 'tmdb-title' }, r.title),
            h('div', { className: 'tmdb-sub' },
              [r.original_title, r.release_date ? r.release_date.slice(0,4) : null].filter(Boolean).join(' · ')
            )
          )
        ))
      )
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '영문 제목'),
      h('input', { className: 'form-input', value: form.e, onChange: e => setForm({...form, e: e.target.value}) })
    ),
    h('div', { className: 'form-row two-col' },
      h('div', null,
        h('label', { className: 'form-label' }, '개봉연도'),
        h('input', { className: 'form-input', type: 'number', value: form.y, onChange: e => setForm({...form, y: e.target.value}) })
      ),
      h('div', null,
        h('label', { className: 'form-label' }, '러닝타임(분)'),
        h('input', { className: 'form-input', type: 'number', value: form.m, onChange: e => setForm({...form, m: e.target.value}) })
      )
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '장르'),
      h('input', { className: 'form-input', value: form.g, onChange: e => setForm({...form, g: e.target.value}), placeholder: '액션/드라마' })
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '감독'),
      h('input', { className: 'form-input', value: form.d, onChange: e => setForm({...form, d: e.target.value}) })
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '시리즈/메모'),
      h('input', { className: 'form-input', value: form.s, onChange: e => setForm({...form, s: e.target.value}) })
    ),
    form.po && h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '포스터 미리보기'),
      h('img', { src: form.po, style: { width: 80, height: 120, borderRadius: 6, objectFit: 'cover' } })
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '플랫폼'),
      h('div', { className: 'platform-grid' },
        PLATFORMS.map(p => h('button', {
          key: p,
          className: 'platform-btn' + (form.p === p ? ' on' : ''),
          onClick: () => setForm({...form, p})
        }, p))
      )
    ),
    h('div', { className: 'btn-row' },
      h('button', { className: 'btn btn-secondary', onClick: onCancel }, '취소'),
      h('button', { className: 'btn btn-primary', onClick: save }, '저장')
    )
  );
}

// =============== DRAMA FORM ===============
function DramaForm({initial, onSave, onCancel, apiKey}) {
  const [form, setForm] = useState(initial || { t:'', e:'', y:'', ey:'', g:'', d:'', s:'', p:'Netflix', po:'', seasons:[], epm: 0, st: 'ended' });
  const [tmdbResults, setTmdbResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!form.t || form.t.length < 2 || searching) return;
    setTmdbResults([]);
    setSearching(true);
    const results = await searchTMDBTv(apiKey, form.t);
    setTmdbResults(results);
    setSearching(false);
  };

  const pickTMDB = async (item) => {
    setTmdbResults([]);
    setSearching(true);
    const detail = await fetchTvDetail(apiKey, item.id);
    setSearching(false);
    if (!detail) return;
    const creator = (detail.created_by || [])[0];
    const genres = (detail.genres || []).map(g => g.name).slice(0, 2).join('/');
    const seasons = (detail.seasons || [])
      .filter(s => s.season_number > 0)
      .map(s => ({
        sn: s.season_number,
        ep: s.episode_count,
        y: s.air_date ? parseInt(s.air_date.slice(0,4)) : 0
      }));
    const epm = (detail.episode_run_time && detail.episode_run_time[0]) || 0;
    const networks = (detail.networks || []).map(n => n.name);
    let platform = form.p;
    if (networks.some(n => /netflix/i.test(n))) platform = 'Netflix';
    else if (networks.some(n => /disney/i.test(n))) platform = 'Disney+';
    setForm({
      ...form,
      t: detail.name || form.t,
      e: detail.original_name || '',
      y: detail.first_air_date ? parseInt(detail.first_air_date.slice(0,4)) : '',
      ey: detail.last_air_date ? parseInt(detail.last_air_date.slice(0,4)) : '',
      g: genres,
      d: creator ? creator.name : '',
      po: detail.poster_path ? POSTER_BASE + detail.poster_path : '',
      seasons, epm,
      st: detail.status === 'Returning Series' ? 'returning' : (detail.status === 'Ended' ? 'ended' : (detail.status === 'Canceled' ? 'canceled' : 'ended')),
      p: platform
    });
  };

  const save = () => {
    if (!form.t.trim()) { alert('제목을 입력하세요'); return; }
    onSave({
      ...form,
      y: form.y ? parseInt(form.y) : 0,
      ey: form.ey ? parseInt(form.ey) : 0,
      epm: form.epm ? parseInt(form.epm) : 0,
      t: form.t.trim()
    });
  };

  const addSeason = () => {
    const nextSn = form.seasons.length ? Math.max(...form.seasons.map(s=>s.sn)) + 1 : 1;
    setForm({...form, seasons: [...form.seasons, {sn: nextSn, ep: 10, y: 0}]});
  };

  return h('div', null,
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '드라마 제목 *'),
      h('input', { className: 'form-input', value: form.t, onChange: e => setForm({...form, t: e.target.value}), placeholder: '드라마 제목' }),
      apiKey && h('button', {
        className: 'btn-search',
        disabled: searching || !form.t || form.t.length < 2,
        onClick: search
      }, searching ? '검색 중...' : '🔍 TMDB에서 검색'),
      tmdbResults.length > 0 && h('div', { className: 'tmdb-results' },
        tmdbResults.map(r => h('div', {
          key: r.id, className: 'tmdb-item', onClick: () => pickTMDB(r)
        },
          h('div', { className: 'tmdb-thumb' },
            r.poster_path && h('img', { src: POSTER_BASE + r.poster_path, loading: 'lazy' })
          ),
          h('div', { className: 'tmdb-info' },
            h('div', { className: 'tmdb-title' }, r.name),
            h('div', { className: 'tmdb-sub' },
              [r.original_name, r.first_air_date ? r.first_air_date.slice(0,4) : null].filter(Boolean).join(' · ')
            )
          )
        ))
      )
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '원제'),
      h('input', { className: 'form-input', value: form.e, onChange: e => setForm({...form, e: e.target.value}) })
    ),
    h('div', { className: 'form-row two-col' },
      h('div', null,
        h('label', { className: 'form-label' }, '첫 방영연도'),
        h('input', { className: 'form-input', type: 'number', value: form.y, onChange: e => setForm({...form, y: e.target.value}) })
      ),
      h('div', null,
        h('label', { className: 'form-label' }, '종영연도'),
        h('input', { className: 'form-input', type: 'number', value: form.ey, onChange: e => setForm({...form, ey: e.target.value}) })
      )
    ),
    h('div', { className: 'form-row two-col' },
      h('div', null,
        h('label', { className: 'form-label' }, '장르'),
        h('input', { className: 'form-input', value: form.g, onChange: e => setForm({...form, g: e.target.value}) })
      ),
      h('div', null,
        h('label', { className: 'form-label' }, '평균 에피소드 분'),
        h('input', { className: 'form-input', type: 'number', value: form.epm, onChange: e => setForm({...form, epm: e.target.value}) })
      )
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '크리에이터'),
      h('input', { className: 'form-input', value: form.d, onChange: e => setForm({...form, d: e.target.value}) })
    ),
    form.po && h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '포스터'),
      h('img', { src: form.po, style: { width: 80, height: 120, borderRadius: 6, objectFit: 'cover' } })
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, '플랫폼'),
      h('div', { className: 'platform-grid' },
        PLATFORMS.map(p => h('button', {
          key: p, className: 'platform-btn' + (form.p === p ? ' on' : ''),
          onClick: () => setForm({...form, p})
        }, p))
      )
    ),
    h('div', { className: 'form-row' },
      h('label', { className: 'form-label' }, `시즌 (${form.seasons.length}개)`),
      form.seasons.map((s, i) => h('div', {
        key: i,
        style: { display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }
      },
        h('span', { style: { fontSize: 13, minWidth: 60, color: 'var(--text-2)' } }, `시즌 ${s.sn}`),
        h('input', {
          className: 'form-input',
          type: 'number',
          value: s.ep,
          style: { flex: 1 },
          onChange: e => {
            const newSeasons = [...form.seasons];
            newSeasons[i] = {...s, ep: parseInt(e.target.value) || 0};
            setForm({...form, seasons: newSeasons});
          },
          placeholder: '에피소드 수'
        }),
        h('button', {
          style: { background:'transparent', border:'none', color:'var(--red)', fontSize:18, padding:'0 8px' },
          onClick: () => setForm({...form, seasons: form.seasons.filter((_,j) => j !== i)})
        }, '✕')
      )),
      h('button', { className: 'add-watch', onClick: addSeason }, '+ 시즌 추가')
    ),
    h('div', { className: 'btn-row' },
      h('button', { className: 'btn btn-secondary', onClick: onCancel }, '취소'),
      h('button', { className: 'btn btn-primary', onClick: save }, '저장')
    )
  );
}

// =============== MOVIE DETAIL ===============
function MovieDetail({m, ud, onUpdate, onDelete, onEdit, onClose, apiKey}) {
  // 포스터 없으면 자동 가져오기 (TMDB 키 있을 때만)
  React.useEffect(() => {
    if (m.po || !apiKey || ud.po[m.id]) return;
    let cancelled = false;
    (async () => {
      try {
        const q = m.e || m.t;
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}&year=${m.y || ''}&language=ko-KR`;
        const r = await fetch(url);
        const data = await r.json();
        if (cancelled) return;
        const hit = (data.results || [])[0];
        if (hit && hit.poster_path) {
          const posterUrl = 'https://image.tmdb.org/t/p/w185' + hit.poster_path;
          onUpdate({ ...ud, po: { ...ud.po, [m.id]: posterUrl } });
        }
      } catch(e) {}
    })();
    return () => { cancelled = true; };
  }, [m.id]);

  const watches = ud.w[m.id] || [];
  const rating = ud.r[m.id] || 0;
  const note = ud.n[m.id] || '';
  const watched = watches.length > 0;
  const [newDate, setNewDate] = useState(todayStr());

  const setRating = (v) => onUpdate({ ...ud, r: { ...ud.r, [m.id]: v } });
  const setNote = (v) => onUpdate({ ...ud, n: { ...ud.n, [m.id]: v } });
  const addWatch = () => {
    if (!newDate) return;
    const w = { ...ud.w, [m.id]: [...(ud.w[m.id] || []), newDate] };
    onUpdate({ ...ud, w });
  };
  const delWatch = (i) => {
    const arr = [...(ud.w[m.id] || [])];
    arr.splice(i, 1);
    const w = { ...ud.w };
    if (arr.length) w[m.id] = arr;
    else delete w[m.id];
    onUpdate({ ...ud, w });
  };

  return h('div', null,
    h('div', { className: 'detail-head' },
      h('div', { className: 'detail-poster' },
        (ud.po[m.id] || m.po) ? h('img', { src: ud.po[m.id] || m.po, alt: m.t, loading: 'lazy' })
              : h('div', { style: { width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, color:'var(--text-3)' } }, '🎬')
      ),
      h('div', { className: 'detail-info' },
        h('h3', { className: 'detail-title' }, m.t),
        m.e && h('div', { className: 'detail-eng' }, m.e),
        m.y && h('div', { className: 'detail-meta' }, `${m.y} · ${m.g || ''}`),
        m.m && h('div', { className: 'detail-meta' }, fmt(m.m)),
        m.d && h('div', { className: 'detail-meta' }, `감독: ${m.d}`),
        m.s && m.s !== '-' && h('div', { className: 'detail-meta' }, m.s),
        h('div', { className: 'detail-meta' }, `🎬 ${m.p}`)
      )
    ),
    h('div', { className: 'section-title' }, '평점'),
    h(StarRating, { value: rating, onChange: setRating }),
    h('div', { className: 'section-title' }, `관람 기록 (${watches.length}회)`),
    h('div', { className: 'watch-list' },
      watches.map((d, i) => h('div', { key: i, className: 'watch-item' },
        h('span', { className: 'dt' }, d),
        h('button', { className: 'watch-del', onClick: () => delWatch(i) }, '✕')
      )),
      h('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
        h('input', { type: 'date', className: 'form-input', value: newDate, onChange: e => setNewDate(e.target.value), style: { flex: 1 } }),
        h('button', { className: 'btn btn-primary', style: { flex: 'none', padding: '8px 16px' }, onClick: addWatch }, '+ 관람')
      )
    ),
    h('div', { className: 'section-title' }, '메모'),
    h('textarea', {
      className: 'memo-area',
      value: note,
      onChange: e => setNote(e.target.value),
      placeholder: '인상 깊었던 장면, 감상...'
    }),
    h('div', { className: 'btn-row' },
      h('button', { className: 'btn btn-secondary', onClick: onEdit }, '✏ 편집'),
      h('button', { className: 'btn btn-danger', onClick: onDelete }, '🗑 삭제')
    )
  );
}

// =============== DRAMA DETAIL ===============
function DramaDetail({d, ud, onUpdate, onDelete, onEdit, onClose}) {
  const watches = ud.tvw[d.id] || {};
  const rating = ud.tvr[d.id] || 0;
  const note = ud.tvn[d.id] || '';

  const setRating = (v) => onUpdate({ ...ud, tvr: { ...ud.tvr, [d.id]: v } });
  const setNote = (v) => onUpdate({ ...ud, tvn: { ...ud.tvn, [d.id]: v } });

  const toggleSeasonDone = (sn, ep) => {
    const w = { ...watches };
    if (w['s'+sn]?.done) {
      delete w['s'+sn];
    } else {
      w['s'+sn] = { done: true, ep: ep, date: todayStr() };
    }
    onUpdate({ ...ud, tvw: { ...ud.tvw, [d.id]: w } });
  };
  const setEpProgress = (sn, total, delta) => {
    const w = { ...watches };
    const cur = w['s'+sn]?.ep || 0;
    const newEp = Math.max(0, Math.min(total, cur + delta));
    if (newEp >= total) {
      w['s'+sn] = { done: true, ep: total, date: todayStr() };
    } else if (newEp === 0) {
      delete w['s'+sn];
    } else {
      w['s'+sn] = { done: false, ep: newEp };
    }
    onUpdate({ ...ud, tvw: { ...ud.tvw, [d.id]: w } });
  };

  const totalSeasons = (d.seasons || []).length;
  const doneSeasons = Object.values(watches).filter(s => s.done).length;
  const statusLabel = d.st === 'returning' ? '방영중' : (d.st === 'canceled' ? '취소됨' : '완결');

  return h('div', null,
    h('div', { className: 'detail-head' },
      h('div', { className: 'detail-poster' },
        d.po ? h('img', { src: d.po, alt: d.t, loading: 'lazy' })
              : h('div', { style: { width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, color:'var(--text-3)' } }, '📺')
      ),
      h('div', { className: 'detail-info' },
        h('h3', { className: 'detail-title' }, d.t),
        d.e && h('div', { className: 'detail-eng' }, d.e),
        h('div', { className: 'detail-meta' }, `${d.y}${d.ey && d.ey !== d.y ? `-${d.ey}` : ''} · ${d.g || ''}`),
        d.epm > 0 && h('div', { className: 'detail-meta' }, `에피소드당 약 ${d.epm}분`),
        d.d && h('div', { className: 'detail-meta' }, `크리에이터: ${d.d}`),
        h('div', { className: 'detail-meta' }, `📺 ${d.p} · ${statusLabel}`)
      )
    ),
    h('div', { className: 'section-title' }, '평점'),
    h(StarRating, { value: rating, onChange: setRating }),
    h('div', { className: 'section-title' }, `시즌 진행 (${doneSeasons}/${totalSeasons})`),
    h('div', { className: 'season-list' },
      (d.seasons || []).map(s => {
        const sw = watches['s'+s.sn] || {};
        const epWatched = sw.ep || 0;
        const isDone = sw.done;
        const pct = s.ep > 0 ? Math.round(epWatched / s.ep * 100) : 0;
        return h('div', { key: s.sn, className: 'season-item' },
          h('div', { className: 'season-head' },
            h('div', null,
              h('div', { className: 'season-title' }, `시즌 ${s.sn}`),
              h('div', { className: 'season-meta' }, `${s.ep}화${s.y ? ` · ${s.y}` : ''}${sw.date ? ` · 완료 ${sw.date}` : ''}`)
            ),
            h('span', {
              className: 'season-status ' + (isDone ? 'done' : (epWatched > 0 ? 'progress' : ''))
            }, isDone ? '완료' : (epWatched > 0 ? `${epWatched}/${s.ep}화` : ''))
          ),
          !isDone && epWatched > 0 && h('div', { className: 'progress-bar' },
            h('div', { className: 'progress-fill', style: { width: pct + '%' } })
          ),
          h('div', { className: 'season-actions' },
            h('button', {
              className: 'season-btn ' + (isDone ? '' : 'primary'),
              onClick: () => toggleSeasonDone(s.sn, s.ep)
            }, isDone ? '완료 취소' : '시즌 완료'),
            !isDone && h('button', {
              className: 'season-btn',
              onClick: () => setEpProgress(s.sn, s.ep, 1)
            }, '+1화'),
            !isDone && epWatched > 0 && h('button', {
              className: 'season-btn',
              onClick: () => setEpProgress(s.sn, s.ep, -1)
            }, '-1화')
          )
        );
      })
    ),
    h('div', { className: 'section-title' }, '메모'),
    h('textarea', {
      className: 'memo-area', value: note, onChange: e => setNote(e.target.value),
      placeholder: '인상 깊은 장면, 감상...'
    }),
    h('div', { className: 'btn-row' },
      h('button', { className: 'btn btn-secondary', onClick: onEdit }, '✏ 편집'),
      h('button', { className: 'btn btn-danger', onClick: onDelete }, '🗑 삭제')
    )
  );
}

// =============== STATS VIEW ===============
function StatsView({ud, allMovies, allDramas}) {
  const movieStats = useMemo(() => {
    const watched = allMovies.filter(m => (ud.w[m.id] || []).length > 0);
    const totalWatches = Object.values(ud.w).reduce((s,arr) => s + arr.length, 0);
    const totalMin = watched.reduce((s,m) => s + (ud.w[m.id].length * (m.m || 0)), 0);
    const ratings = Object.values(ud.r).filter(r => r > 0);
    const avgRating = ratings.length ? (ratings.reduce((s,r)=>s+r,0) / ratings.length).toFixed(1) : '-';
    const genreCounts = {};
    watched.forEach(m => {
      (m.g || '').split('/').forEach(g => {
        g = g.trim();
        if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    const topGenres = Object.entries(genreCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const dirCounts = {};
    watched.forEach(m => { if (m.d) dirCounts[m.d] = (dirCounts[m.d] || 0) + 1; });
    const topDirs = Object.entries(dirCounts).sort((a,b) => b[1]-a[1]).slice(0, 5);
    return { watched: watched.length, total: allMovies.length, totalWatches, totalMin, avgRating, topGenres, topDirs };
  }, [ud, allMovies]);

  const dramaStats = useMemo(() => {
    let doneSeasons = 0, totalEp = 0, totalMin = 0, doneCount = 0;
    allDramas.forEach(d => {
      const w = ud.tvw[d.id] || {};
      Object.values(w).forEach(s => {
        if (s.done) { doneSeasons += 1; totalEp += s.ep || 0; totalMin += (s.ep || 0) * (d.epm || 0); }
        else if (s.ep) { totalEp += s.ep; totalMin += (s.ep || 0) * (d.epm || 0); }
      });
      const total = (d.seasons || []).length;
      const done = Object.values(w).filter(s => s.done).length;
      if (total > 0 && done === total) doneCount++;
    });
    const ratings = Object.values(ud.tvr).filter(r => r > 0);
    const avgRating = ratings.length ? (ratings.reduce((s,r)=>s+r,0) / ratings.length).toFixed(1) : '-';
    return { total: allDramas.length, doneCount, doneSeasons, totalEp, totalMin, avgRating };
  }, [ud, allDramas]);

  const totalHours = Math.floor((movieStats.totalMin + dramaStats.totalMin) / 60);

  return h('div', null,
    h('div', { className: 'stats-grid' },
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, totalHours),
        h('div', { className: 'label' }, '총 시청 시간 (h)')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, movieStats.totalWatches + dramaStats.totalEp),
        h('div', { className: 'label' }, '본 영상')
      )
    ),
    h('div', { className: 'section-title' }, '🎬 영화'),
    h('div', { className: 'stats-grid' },
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, `${movieStats.watched}/${movieStats.total}`),
        h('div', { className: 'label' }, '관람')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, movieStats.totalWatches),
        h('div', { className: 'label' }, '관람 횟수')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, Math.floor(movieStats.totalMin / 60)),
        h('div', { className: 'label' }, '시간')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, movieStats.avgRating),
        h('div', { className: 'label' }, '평균 평점')
      )
    ),
    movieStats.topGenres.length > 0 && h('div', { className: 'stat-bars' },
      h('h3', null, '장르 분포'),
      movieStats.topGenres.map(([g,n]) => {
        const max = movieStats.topGenres[0][1];
        return h('div', { key: g, className: 'bar-row' },
          h('div', { className: 'bar-label' }, g),
          h('div', { className: 'bar-track' },
            h('div', { className: 'bar-fill', style: { width: (n/max*100) + '%' } })
          ),
          h('div', { className: 'bar-num' }, n)
        );
      })
    ),
    movieStats.topDirs.length > 0 && h('div', { className: 'stat-bars' },
      h('h3', null, '감독 TOP 5'),
      movieStats.topDirs.map(([dir,n]) => {
        const max = movieStats.topDirs[0][1];
        return h('div', { key: dir, className: 'bar-row' },
          h('div', { className: 'bar-label' }, dir),
          h('div', { className: 'bar-track' },
            h('div', { className: 'bar-fill', style: { width: (n/max*100) + '%' } })
          ),
          h('div', { className: 'bar-num' }, n)
        );
      })
    ),
    h('div', { className: 'section-title' }, '📺 드라마'),
    h('div', { className: 'stats-grid' },
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, `${dramaStats.doneCount}/${dramaStats.total}`),
        h('div', { className: 'label' }, '완결 시청')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, dramaStats.doneSeasons),
        h('div', { className: 'label' }, '완료 시즌')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, dramaStats.totalEp),
        h('div', { className: 'label' }, '에피소드')
      ),
      h('div', { className: 'stat-card' },
        h('div', { className: 'num' }, dramaStats.avgRating),
        h('div', { className: 'label' }, '평균 평점')
      )
    )
  );
}

// =============== SETTINGS ===============
function SettingsView({ud, onUpdate, apiKey, setApiKey, theme, setTheme}) {
  const [posterLoading, setPosterLoading] = React.useState(false);
  const [posterProgress, setPosterProgress] = React.useState({ done: 0, total: 0 });
  
  const fetchAllPosters = async () => {
    if (!apiKey) { alert('TMDB API 키를 먼저 설정하세요'); return; }
    const allMovies = (window.MOVIES || []).filter(m => !ud.h.includes(m.id) && !ud.po[m.id]).concat(
      ud.c.filter(m => !ud.po[m.id] && !m.po)
    );
    if (allMovies.length === 0) { alert('이미 모든 영화의 포스터가 있습니다'); return; }
    if (!confirm(`${allMovies.length}편의 포스터를 가져옵니다. 1~2분 정도 걸립니다. 계속하시겠습니까?`)) return;
    
    setPosterLoading(true);
    setPosterProgress({ done: 0, total: allMovies.length });
    let newPo = { ...ud.po };
    
    for (let i = 0; i < allMovies.length; i++) {
      const m = allMovies[i];
      try {
        const q = m.e || m.t;
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}&year=${m.y || ''}&language=ko-KR`;
        const r = await fetch(url);
        const data = await r.json();
        const hit = (data.results || [])[0];
        if (hit && hit.poster_path) {
          newPo[m.id] = 'https://image.tmdb.org/t/p/w185' + hit.poster_path;
        }
      } catch(e) {}
      setPosterProgress({ done: i + 1, total: allMovies.length });
      // Rate limit 보호
      await new Promise(r => setTimeout(r, 250));
    }
    
    onUpdate({ ...ud, po: newPo });
    setPosterLoading(false);
    alert(`완료! ${Object.keys(newPo).length - Object.keys(ud.po).length}편 포스터 가져옴`);
  };

  const fileRef = useRef(null);
  const [apiInput, setApiInput] = useState(apiKey || '');

  const exportData = () => {
    const data = { version: 3, exported_at: new Date().toISOString(), ud, apiKey };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pensieve-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.ud && !data.data) { alert('백업 파일 형식이 올바르지 않습니다'); return; }
        if (!confirm('현재 데이터를 백업으로 교체합니다. 진행할까요?')) return;
        const newUd = migrate(data.ud || data.data);
        onUpdate(newUd);
        if (data.apiKey) setApiKey(data.apiKey);
        alert('복원 완료');
      } catch(err) { alert('파일을 읽지 못했습니다'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return h('div', null,
    h('div', { className: 'settings-section' },
      h('div', { className: 'settings-title' }, '테마'),
      h('div', { className: 'theme-row' },
        h('button', { className: 'theme-btn' + (theme === 'dark' ? ' on' : ''), onClick: () => setTheme('dark') }, '🌙 다크'),
        h('button', { className: 'theme-btn' + (theme === 'light' ? ' on' : ''), onClick: () => setTheme('light') }, '☀ 라이트')
      )
    ),
    h('div', { className: 'settings-section' },
      h('div', { className: 'settings-title' }, 'TMDB API 키'),
      h('input', { className: 'form-input', value: apiInput, onChange: e => setApiInput(e.target.value), placeholder: 'API 키 입력' }),
      h('button', {
        className: 'btn btn-primary', style: { marginTop: 8 },
        onClick: () => { setApiKey(apiInput.trim()); alert('저장됨'); }
      }, '저장'),
      h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 8 } },
        '키가 있으면 영화/드라마 추가 시 TMDB 자동 검색이 가능합니다.'
      )
    ),
    h('div', { className: 'settings-section' },
      h('div', { className: 'settings-title' }, '포스터 일괄 가져오기'),
      h('div', { style: { fontSize: 12, color: 'var(--text-2)', marginBottom: 10 } },
        '포스터 없는 영화들의 포스터를 TMDB에서 한 번에 가져옵니다.'
      ),
      posterLoading 
        ? h('div', { style: { textAlign: 'center', padding: 12 } },
            h('div', { style: { fontSize: 14, color: 'var(--gold)', fontWeight: 600 } },
              `진행 중... ${posterProgress.done} / ${posterProgress.total}`
            ),
            h('div', { className: 'progress-bar', style: { marginTop: 8 } },
              h('div', { className: 'progress-fill', style: { width: (posterProgress.total > 0 ? posterProgress.done / posterProgress.total * 100 : 0) + '%' } })
            )
          )
        : h('button', { 
            className: 'btn btn-secondary', 
            onClick: fetchAllPosters,
            disabled: !apiKey
          }, apiKey ? '🎬 포스터 일괄 가져오기' : 'TMDB API 키 필요')
    ),
    h('div', { className: 'settings-section' },
      h('div', { className: 'settings-title' }, '백업 / 복원'),
      h('button', { className: 'btn btn-secondary', style: { marginBottom: 8 }, onClick: exportData }, '⬇ 백업 다운로드'),
      h('button', { className: 'btn btn-secondary', onClick: () => fileRef.current.click() }, '⬆ 백업 복원'),
      h('input', { type: 'file', ref: fileRef, accept: '.json', style: { display: 'none' }, onChange: importData })
    ),
    h('div', { className: 'settings-section' },
      h('div', { className: 'settings-title' }, 'PENSIEVE'),
      h('div', { style: { fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 } },
        h('div', null, 'v3.0 · 영화와 드라마 기록'),
        h('div', { style: { marginTop: 6 } }, (() => {
          const movieCount = ((window.MOVIES||[]).filter(m => !ud.h.includes(m.id)).length) + ud.c.length;
          const dramaCount = ud.tv.length;
          return `영화 ${movieCount}편 · 드라마 ${dramaCount}편`;
        })())
      )
    )
  );
}

// =============== MAIN APP ===============
function App() {
  const [ud, setUd] = useState(() => migrate(LS('ml-ud', null)));
  const [tab, setTab] = useState('movies'); // movies | tv | stats
  const [view, setView] = useState(LS('ml-view', 'list')); // list | grid
  const [theme, setThemeState] = useState(LS('ml-theme', 'dark'));
  const [apiKey, setApiKeyState] = useState(LS('ml-ak', ''));
  const [search, setSearch] = useState('');
  const [filterP, setFilterP] = useState('전체');
  const [filterW, setFilterW] = useState('전체');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Save ud whenever it changes
  useEffect(() => { SS('ml-ud', ud); }, [ud]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); SS('ml-theme', theme); }, [theme]);
  useEffect(() => { SS('ml-ak', apiKey); }, [apiKey]);
  useEffect(() => { SS('ml-view', view); }, [view]);

  // All movies = hardcoded + custom - hidden
  const allMovies = useMemo(() => {
    const baseMovies = (window.MOVIES || []).map(m => {
      // Apply user edits to hardcoded movies
      if (ud.edits[m.id]) return { ...m, ...ud.edits[m.id] };
      // Apply user poster
      if (ud.po[m.id]) return { ...m, po: ud.po[m.id] };
      return m;
    });
    return [...baseMovies, ...ud.c].filter(m => !ud.h.includes(m.id));
  }, [ud.c, ud.edits, ud.h, ud.po]);

  const allDramas = useMemo(() => {
    return ud.tv.filter(d => !ud.tvh.includes(d.id));
  }, [ud.tv, ud.tvh]);

  // Filtered & sorted movies
  const filteredMovies = useMemo(() => {
    let arr = allMovies;
    if (search) {
      const q = search.toLowerCase().trim();
      const qChosung = chosung(q);
      arr = arr.filter(m => {
        const fields = [m.t, m.e, m.d, m.s, ud.n[m.id] || ''].filter(Boolean).join(' ').toLowerCase();
        return fields.includes(q) || chosung(fields).includes(qChosung);
      });
    }
    if (filterP !== '전체') arr = arr.filter(m => m.p === filterP);
    if (filterW === '봄') arr = arr.filter(m => (ud.w[m.id] || []).length > 0);
    else if (filterW === '안봄') arr = arr.filter(m => !(ud.w[m.id] || []).length);
    arr = [...arr];
    if (sort === 'recent') {
      arr.sort((a,b) => {
        const da = (ud.w[a.id] || []).slice(-1)[0] || '';
        const db = (ud.w[b.id] || []).slice(-1)[0] || '';
        return db.localeCompare(da);
      });
    } else if (sort === 'rating') {
      arr.sort((a,b) => (ud.r[b.id] || 0) - (ud.r[a.id] || 0));
    } else if (sort === 'title') {
      arr.sort((a,b) => a.t.localeCompare(b.t, 'ko'));
    } else if (sort === 'year') {
      arr.sort((a,b) => (b.y || 0) - (a.y || 0));
    } else if (sort === 'runtime') {
      arr.sort((a,b) => (a.m || 999999) - (b.m || 999999));
    } else if (sort === 'random') {
      arr.sort(() => Math.random() - 0.5);
    }
    return arr;
  }, [allMovies, search, filterP, filterW, sort, ud.w, ud.r, ud.n]);

  const filteredDramas = useMemo(() => {
    let arr = allDramas;
    if (search) {
      const q = search.toLowerCase().trim();
      arr = arr.filter(d => [d.t, d.e, d.d, ud.tvn[d.id] || ''].filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    if (filterP !== '전체') arr = arr.filter(d => d.p === filterP);
    if (filterW === '봄') arr = arr.filter(d => Object.keys(ud.tvw[d.id] || {}).length > 0);
    else if (filterW === '안봄') arr = arr.filter(d => !Object.keys(ud.tvw[d.id] || {}).length);
    arr = [...arr];
    if (sort === 'rating') arr.sort((a,b) => (ud.tvr[b.id] || 0) - (ud.tvr[a.id] || 0));
    else if (sort === 'title') arr.sort((a,b) => a.t.localeCompare(b.t, 'ko'));
    else if (sort === 'year') arr.sort((a,b) => (b.y || 0) - (a.y || 0));
    else if (sort === 'random') arr.sort(() => Math.random() - 0.5);
    return arr;
  }, [allDramas, search, filterP, filterW, sort, ud.tvw, ud.tvr, ud.tvn]);

  // Pagination
  const currentList = tab === 'movies' ? filteredMovies : filteredDramas;
  const totalPages = Math.max(1, Math.ceil(currentList.length / PER_PAGE));
  const pageItems = currentList.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [tab, search, filterP, filterW, sort]);

  // Movie handlers
  const saveMovie = (m) => {
    if (showEdit && showEdit.type === 'movie') {
      const original = showEdit.movie;
      if ((window.MOVIES || []).some(mv => mv.id === original.id)) {
        // Editing hardcoded movie - save to edits
        setUd({ ...ud, edits: { ...ud.edits, [original.id]: m } });
      } else {
        // Editing custom movie
        setUd({ ...ud, c: ud.c.map(mv => mv.id === original.id ? { ...mv, ...m } : mv) });
      }
      setShowEdit(null);
    } else {
      // New movie
      const newId = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      setUd({ ...ud, c: [...ud.c, { ...m, id: newId }] });
    }
    setShowAdd(false);
  };
  const deleteMovie = (m) => {
    if (!confirm(`"${m.t}"을(를) 삭제할까요?\n평점/메모/관람 기록도 함께 삭제됩니다.`)) return;
    const isHardcoded = (window.MOVIES || []).some(mv => mv.id === m.id);
    const newW = { ...ud.w }; delete newW[m.id];
    const newR = { ...ud.r }; delete newR[m.id];
    const newN = { ...ud.n }; delete newN[m.id];
    const newEdits = { ...ud.edits }; delete newEdits[m.id];
    const update = { ...ud, w: newW, r: newR, n: newN, edits: newEdits };
    if (isHardcoded) {
      update.h = [...ud.h, m.id];
    } else {
      update.c = ud.c.filter(mv => mv.id !== m.id);
    }
    setUd(update);
    setShowDetail(null);
  };

  // Drama handlers
  const saveDrama = (d) => {
    if (showEdit && showEdit.type === 'tv') {
      const original = showEdit.drama;
      setUd({ ...ud, tv: ud.tv.map(dv => dv.id === original.id ? { ...dv, ...d } : dv) });
      setShowEdit(null);
    } else {
      const newId = 'tv_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      setUd({ ...ud, tv: [...ud.tv, { ...d, id: newId }] });
    }
    setShowAdd(false);
  };
  const deleteDrama = (d) => {
    if (!confirm(`"${d.t}"을(를) 삭제할까요?`)) return;
    const newTvw = { ...ud.tvw }; delete newTvw[d.id];
    const newTvr = { ...ud.tvr }; delete newTvr[d.id];
    const newTvn = { ...ud.tvn }; delete newTvn[d.id];
    setUd({
      ...ud, tvw: newTvw, tvr: newTvr, tvn: newTvn,
      tv: ud.tv.filter(dv => dv.id !== d.id)
    });
    setShowDetail(null);
  };

  const movieCount = allMovies.length;
  const dramaCount = allDramas.length;

  // Empty welcome
  const isEmpty = movieCount === 0 && dramaCount === 0;

  return h('div', null,
    h('div', { className: 'header' },
      h('div', { className: 'brand' },
        h('h1', { className: 'brand-title' },
          h('span', { className: 'brand-mark' }, '⚯'), 'PENSIEVE'
        ),
        h('div', { className: 'brand-sub' }, '기억의 영상 보관소'),
        h('button', { className: 'settings-btn', onClick: () => setShowSettings(true) }, '⚙')
      ),
      h('div', { className: 'maintabs' },
        h('button', {
          className: 'maintab' + (tab === 'movies' ? ' on' : ''),
          onClick: () => setTab('movies')
        }, '🎬 영화', h('span', { className: 'count' }, movieCount)),
        h('button', {
          className: 'maintab' + (tab === 'tv' ? ' on' : ''),
          onClick: () => setTab('tv')
        }, '📺 드라마', h('span', { className: 'count' }, dramaCount)),
        h('button', {
          className: 'maintab' + (tab === 'stats' ? ' on' : ''),
          onClick: () => setTab('stats')
        }, '📊 통계')
      ),
      tab !== 'stats' && h('div', null,
        h('div', { className: 'search-wrap' },
          h('span', { className: 'search-icon' }, '🔍'),
          h('input', {
            className: 'search-input', value: search,
            onChange: e => setSearch(e.target.value),
            placeholder: tab === 'movies' ? '영화 검색 (제목/감독/메모)' : '드라마 검색'
          }),
          search && h('button', { className: 'search-clear', onClick: () => setSearch('') }, '✕')
        ),
        h('div', { className: 'filterbar' },
          ['전체','봄','안봄'].map(f => h('button', {
            key: f, className: 'chip' + (filterW === f ? ' on' : ''),
            onClick: () => setFilterW(f)
          }, f)),
          h('span', { style: { width: 8 } }),
          ['전체', ...PLATFORMS].map(f => h('button', {
            key: f, className: 'chip' + (filterP === f ? ' on' : ''),
            onClick: () => setFilterP(f)
          }, f))
        ),
        h('div', { className: 'sort-row' },
          h('span', { className: 'sort-label' }, '정렬:'),
          h('select', {
            className: 'sort-select', value: sort, onChange: e => setSort(e.target.value)
          },
            (tab === 'movies' ? SORT_OPTIONS : TV_SORT_OPTIONS).map(([v,l]) =>
              h('option', { key: v, value: v }, l))
          ),
          tab === 'movies' && h('div', { className: 'view-toggle' },
            h('button', { className: view === 'list' ? 'on' : '', onClick: () => setView('list') }, '☰'),
            h('button', { className: view === 'grid' ? 'on' : '', onClick: () => setView('grid') }, '▦')
          )
        ),
        h('div', { className: 'result-count' }, `${currentList.length}편`)
      )
    ),
    h('div', { style: { padding: '0 16px 100px' } },
      isEmpty && tab !== 'stats' ? h('div', { className: 'welcome' },
        h('div', { className: 'welcome-icon' }, '⚯'),
        h('h2', { className: 'welcome-title' }, 'PENSIEVE에 오신 것을 환영합니다'),
        h('div', { className: 'welcome-sub' },
          '아이디어와 기억을 보관하던 펜시브처럼, 당신이 본 영화와 드라마를 보관하세요. 우측 하단 ➕ 버튼으로 시작합니다.'
        )
      ) :
      tab === 'stats' ? h(StatsView, { ud, allMovies, allDramas }) :
      tab === 'movies' && view === 'grid' && currentList.length > 0 ?
        h('div', { className: 'grid' },
          pageItems.map(m => h(GridCard, {
            key: m.id, m,
            watched: (ud.w[m.id] || []).length > 0,
            onClick: () => setShowDetail({ type: 'movie', movie: m })
          }))
        ) :
      currentList.length === 0 ? h('div', { className: 'empty' },
        h('div', { className: 'empty-icon' }, '🔍'),
        h('div', { className: 'empty-title' }, '결과 없음'),
        h('div', { className: 'empty-sub' }, '검색어나 필터를 조정해보세요')
      ) :
      h('div', { className: 'list' },
        pageItems.map(item => tab === 'movies'
          ? h(MovieCard, {
              key: item.id, m: item,
              watched: (ud.w[item.id] || []).length > 0,
              rating: ud.r[item.id] || 0,
              lastDate: (ud.w[item.id] || []).slice(-1)[0],
              onClick: () => setShowDetail({ type: 'movie', movie: item })
            })
          : h(DramaCard, {
              key: item.id, d: item,
              rating: ud.tvr[item.id] || 0,
              progress: (() => {
                const w = ud.tvw[item.id] || {};
                const done = Object.values(w).filter(s => s.done).length;
                const total = (item.seasons || []).length;
                const inProgress = Object.entries(w).find(([k,s]) => !s.done && s.ep > 0);
                return {
                  done, total,
                  watched: done > 0 || !!inProgress,
                  epProgress: inProgress ? `시즌${inProgress[0].slice(1)} ${inProgress[1].ep}화` : null
                };
              })(),
              onClick: () => setShowDetail({ type: 'tv', drama: item })
            })
        )
      ),
      totalPages > 1 && tab !== 'stats' && h('div', { className: 'pager' },
        page > 1 && h('button', { className: 'pgnum', onClick: () => setPage(page - 1) }, '‹'),
        Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
          .map((p, i, arr) => {
            const prev = arr[i-1];
            return [
              prev && p - prev > 1 ? h('span', { key: 'd'+p, className: 'pgdots' }, '…') : null,
              h('button', {
                key: p, className: 'pgnum' + (p === page ? ' on' : ''),
                onClick: () => { setPage(p); window.scrollTo(0, 0); }
              }, p)
            ];
          }),
        page < totalPages && h('button', { className: 'pgnum', onClick: () => setPage(page + 1) }, '›')
      )
    ),
    // FAB
    tab !== 'stats' && h('button', {
      className: 'fab',
      onClick: () => setShowAdd(true)
    }, '+'),

    // Modals
    h(PModal, {
      show: showAdd, onClose: () => setShowAdd(false),
      title: tab === 'movies' ? '영화 추가' : '드라마 추가'
    },
      showAdd && (tab === 'movies'
        ? h(MovieForm, { onSave: saveMovie, onCancel: () => setShowAdd(false), apiKey })
        : h(DramaForm, { onSave: saveDrama, onCancel: () => setShowAdd(false), apiKey }))
    ),
    h(PModal, {
      show: !!showEdit, onClose: () => setShowEdit(null),
      title: showEdit?.type === 'tv' ? '드라마 편집' : '영화 편집'
    },
      showEdit && (showEdit.type === 'movie'
        ? h(MovieForm, { initial: showEdit.movie, onSave: saveMovie, onCancel: () => setShowEdit(null), apiKey })
        : h(DramaForm, { initial: showEdit.drama, onSave: saveDrama, onCancel: () => setShowEdit(null), apiKey }))
    ),
    h(PModal, {
      show: !!showDetail, onClose: () => setShowDetail(null)
    },
      showDetail && (showDetail.type === 'movie'
        ? h(MovieDetail, {
            m: showDetail.movie, ud, onUpdate: setUd, apiKey,
            onDelete: () => deleteMovie(showDetail.movie),
            onEdit: () => { setShowEdit(showDetail); setShowDetail(null); },
            onClose: () => setShowDetail(null)
          })
        : h(DramaDetail, {
            d: showDetail.drama, ud, onUpdate: setUd,
            onDelete: () => deleteDrama(showDetail.drama),
            onEdit: () => { setShowEdit(showDetail); setShowDetail(null); },
            onClose: () => setShowDetail(null)
          }))
    ),
    h(PModal, {
      show: showSettings, onClose: () => setShowSettings(false), title: '설정'
    },
      showSettings && h(SettingsView, {
        ud, onUpdate: setUd,
        apiKey, setApiKey: setApiKeyState,
        theme, setTheme: setThemeState
      })
    )
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
})();
