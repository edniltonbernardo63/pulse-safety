/**
 * SST Safe Zone (TEC - SST) — versão Google Apps Script
 * Banco de dados: a Planilha Google à qual este script está vinculado.
 * Cada tabela do sistema original (Supabase) virou uma aba da planilha.
 */

// ============================================================
// ESQUEMA (tabelas → abas)
// Tipos: s = texto, n = número, b = verdadeiro/falso
// ============================================================
var SCHEMA = {
  Usuarios: { id: 's', nome: 's', email: 's', senha_hash: 's', salt: 's', role: 's', created_at: 's' },
  Configuracoes: {
    id: 's', nome_empresa: 's', razao_social: 's', nome_fantasia: 's', cnpj: 's', endereco: 's',
    telefone: 's', email: 's', logo_url: 's', arte_sipat_url: 's',
    tecnico_responsavel_nome: 's', tecnico_responsavel_registro: 's', updated_at: 's'
  },
  Parceiros: {
    id: 's', nome: 's', razao_social: 's', nome_fantasia: 's', cnpj: 's', contato: 's', email: 's',
    telefone: 's', endereco: 's', logo_url: 's', tipos_treinamento: 's', observacoes: 's',
    created_at: 's', updated_at: 's'
  },
  NormasNR: {
    id: 's', codigo: 's', titulo: 's', resumo: 's', periodicidade_meses: 'n',
    carga_horaria_minima: 'n', base_legal: 's', link_oficial: 's', created_at: 's'
  },
  Colaboradores: {
    id: 's', matricula: 's', nome: 's', cpf: 's', rg: 's', data_nascimento: 's', telefone: 's', email: 's',
    email_corporativo: 's', endereco: 's', foto_url: 's', funcao_atual: 's', setor: 's', empresa: 's',
    data_admissao: 's', status: 's', qrcode_token: 's', created_at: 's', updated_at: 's'
  },
  HistoricoFuncoes: { id: 's', colaborador_id: 's', funcao: 's', data_inicio: 's', data_fim: 's', created_at: 's' },
  Treinamentos: {
    id: 's', nome: 's', tipo: 's', nr_id: 's', parceiro_id: 's', carga_horaria: 'n',
    validade_valor: 'n', validade_unidade: 's', validade_meses: 'n', conteudo_programatico: 's',
    data_hora: 's', local: 's', instrutor: 's', concluido: 'b', data_conclusao: 's', ativo: 'b', created_at: 's'
  },
  TreinamentosRealizados: {
    id: 's', colaborador_id: 's', treinamento_id: 's', data_realizacao: 's', data_vencimento: 's',
    instrutor: 's', local: 's', observacoes: 's', certificado_numero: 's', created_at: 's'
  },
  EPIs: {
    id: 's', colaborador_id: 's', tipo: 's', ca_numero: 's', data_entrega: 's', vida_util_valor: 'n',
    vida_util_unidade: 's', vida_util_meses: 'n', data_vencimento: 's', observacoes: 's', created_at: 's'
  },
  EPIsSetor: { id: 's', setor: 's', tipo_epi: 's', ca_padrao: 's', vida_util_meses: 'n', created_at: 's' },
  Eventos: {
    id: 's', titulo: 's', tipo: 's', data_inicio: 's', data_fim: 's', descricao: 's', local: 's',
    treinamento_id: 's', colaboradores_convocados: 's', created_at: 's'
  },
  ColaboradorNRs: {
    id: 's', colaborador_id: 's', nr_id: 's', data_realizacao: 's', data_vencimento: 's',
    observacoes: 's', created_at: 's', updated_at: 's'
  }
};

// Tabelas que o aplicativo carrega (Usuarios fica de fora por segurança)
var APP_TABLES = ['Configuracoes', 'Parceiros', 'NormasNR', 'Colaboradores', 'HistoricoFuncoes',
  'Treinamentos', 'TreinamentosRealizados', 'EPIs', 'EPIsSetor', 'Eventos', 'ColaboradorNRs'];

// Tabelas que técnicos/admins podem gravar pelo método genérico
var WRITABLE = ['Parceiros', 'Colaboradores', 'HistoricoFuncoes', 'Treinamentos',
  'TreinamentosRealizados', 'EPIs', 'EPIsSetor', 'Eventos', 'ColaboradorNRs', 'NormasNR'];

// Exclusões permitidas (iguais ao sistema original)
var DELETABLE = ['ColaboradorNRs', 'EPIs', 'EPIsSetor', 'Eventos'];

var SESSION_HOURS = 6;

// ============================================================
// WEB APP
// ============================================================
function doGet(e) {
  ensureSetup_();
  var params = (e && e.parameter) || {};
  var tpl = HtmlService.createTemplateFromFile('Index');
  tpl.appUrl = ScriptApp.getService().getUrl();
  // Com ?qr=TOKEN abre a consulta pública do crachá; sem parâmetro abre o sistema
  tpl.qrData = params.qr ? JSON.stringify(qrData_(params.qr)).replace(/</g, '\\u003c') : 'null';
  return tpl.evaluate()
    .setTitle(params.qr ? 'Consulta do colaborador — TEC - SST' : 'TEC - SST')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Menu na planilha para facilitar o primeiro uso */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('TEC - SST')
    .addItem('Preparar planilha (criar abas e NRs)', 'setup')
    .addToUi();
}

function setup() {
  ensureSetup_(true);
  var url = ss_().getUrl();
  Logger.log('Planilha do sistema: ' + url);
  try { SpreadsheetApp.getUi().alert('Planilha preparada! Agora publique como App da Web (Implantar → Nova implantação).'); } catch (e) {}
  return url;
}

/** Mostra no Registro de execução o link da planilha usada como banco de dados */
function mostrarLinkPlanilha() {
  Logger.log('Planilha do sistema: ' + ss_().getUrl());
}

// ============================================================
// API — ponto único de entrada chamado pelo navegador
// ============================================================
function api(token, action, payload) {
  try {
    ensureSetup_();
    payload = payload || {};
    if (action === 'login') return ok_(login_(payload.email, payload.password));
    if (action === 'signup') return ok_(signup_(payload.nome, payload.email, payload.password));

    var user = userFromToken_(token);
    if (!user) return { ok: false, auth: true, error: 'Sessão expirada. Entre novamente.' };

    switch (action) {
      case 'bootstrap': return ok_({ user: publicUser_(user), db: loadAll_(), appUrl: ScriptApp.getService().getUrl() });
      case 'logout': CacheService.getScriptCache().remove('sess_' + token); return ok_(true);
      case 'save': requireWrite_(user); saveRecord_(payload.table, payload.record); break;
      case 'remove': requireWrite_(user); removeRecord_(payload.table, payload.id); break;
      case 'concluir': requireWrite_(user); concluirTreinamento_(payload.treinamento_id, payload.colaboradores, payload.data); break;
      case 'saveConfig': requireRole_(user, ['admin']); saveConfig_(payload.record); break;
      case 'listUsers': requireRole_(user, ['admin']); return ok_(listUsers_());
      case 'setRole': requireRole_(user, ['admin']); setRole_(user, payload.id, payload.role); return ok_(listUsers_());
      case 'exportSheet': return ok_(exportSheet_(payload.title, payload.headers, payload.rows));
      default: throw new Error('Ação desconhecida: ' + action);
    }
    return ok_({ db: loadAll_() });
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function ok_(data) { return { ok: true, data: data }; }

function requireWrite_(user) { requireRole_(user, ['admin', 'tecnico']); }
function requireRole_(user, roles) {
  if (roles.indexOf(user.role) < 0) throw new Error('Seu perfil (' + user.role + ') não tem permissão para esta ação.');
}

// ============================================================
// AUTENTICAÇÃO (e-mail + senha, como no original)
// ============================================================
function hash_(password, salt) {
  var v = salt + '|' + password;
  for (var i = 0; i < 150; i++) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, v, Utilities.Charset.UTF_8);
    v = Utilities.base64Encode(bytes);
  }
  return v;
}

function signup_(nome, email, password) {
  email = String(email || '').trim().toLowerCase();
  nome = String(nome || '').trim();
  if (!email || email.indexOf('@') < 1) throw new Error('E-mail inválido.');
  if (!password || String(password).length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  return withLock_(function () {
    var users = readTable_('Usuarios');
    if (users.some(function (u) { return u.email === email; })) throw new Error('Já existe uma conta com este e-mail.');
    var salt = Utilities.getUuid();
    var role = users.length === 0 ? 'admin' : 'tecnico'; // primeiro usuário = administrador
    insertRow_('Usuarios', {
      id: uuid_(), nome: nome || email.split('@')[0], email: email,
      senha_hash: hash_(String(password), salt), salt: salt, role: role, created_at: nowIso_()
    });
    return { role: role };
  });
}

function login_(email, password) {
  email = String(email || '').trim().toLowerCase();
  var u = readTable_('Usuarios').filter(function (x) { return x.email === email; })[0];
  if (!u || hash_(String(password || ''), u.salt) !== u.senha_hash) throw new Error('E-mail ou senha inválidos.');
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('sess_' + token, u.id, SESSION_HOURS * 3600);
  return { token: token, user: publicUser_(u) };
}

function userFromToken_(token) {
  if (!token) return null;
  var id = CacheService.getScriptCache().get('sess_' + token);
  if (!id) return null;
  return readTable_('Usuarios').filter(function (u) { return u.id === id; })[0] || null;
}

function publicUser_(u) { return { id: u.id, nome: u.nome, email: u.email, role: u.role }; }

function listUsers_() {
  return readTable_('Usuarios').map(publicUser_).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
}

function setRole_(me, id, role) {
  if (['admin', 'tecnico', 'consulta'].indexOf(role) < 0) throw new Error('Perfil inválido.');
  if (id === me.id && role !== 'admin') throw new Error('Você não pode remover seu próprio perfil de administrador.');
  withLock_(function () { updateRow_('Usuarios', id, { role: role }); });
}

// ============================================================
// GRAVAÇÃO GENÉRICA + REGRAS (equivalentes aos triggers do Supabase)
// ============================================================
function saveRecord_(table, rec) {
  if (WRITABLE.indexOf(table) < 0) throw new Error('Tabela não permitida: ' + table);
  rec = clean_(table, rec || {});
  withLock_(function () {
    var isNew = !rec.id;
    var now = nowIso_();

    if (table === 'Colaboradores') {
      if (!rec.nome) throw new Error('Informe o nome.');
      if (!rec.status) rec.status = 'ativo';
      delete rec.qrcode_token;
      delete rec.matricula; // gerada pelo sistema e nunca alterada
      if (isNew) {
        rec.qrcode_token = Utilities.getUuid().replace(/-/g, '');
        rec.matricula = gerarMatricula_();
      }
    }
    if (table === 'NormasNR' && rec.codigo) {
      var dupNr = readTable_('NormasNR').filter(function (n) { return n.codigo === rec.codigo && n.id !== rec.id; });
      if (dupNr.length) throw new Error('Já existe uma NR com o código ' + rec.codigo + '.');
    }
    if (table === 'TreinamentosRealizados') {
      if (!rec.colaborador_id || !rec.treinamento_id || !rec.data_realizacao) throw new Error('Colaborador, treinamento e data são obrigatórios.');
      if (!rec.data_vencimento) rec.data_vencimento = vencTreinamento_(rec.treinamento_id, rec.data_realizacao);
    }
    if (table === 'ColaboradorNRs') {
      var dup = readTable_('ColaboradorNRs').filter(function (x) {
        return x.colaborador_id === rec.colaborador_id && x.nr_id === rec.nr_id && x.id !== rec.id;
      });
      if (dup.length) throw new Error('Esta NR já está vinculada ao colaborador.');
      if (!rec.data_vencimento && rec.data_realizacao) rec.data_vencimento = vencNr_(rec.nr_id, rec.data_realizacao);
      rec.updated_at = now;
    }
    if (table === 'EPIsSetor') {
      var dupE = readTable_('EPIsSetor').filter(function (x) {
        return x.setor === rec.setor && String(x.tipo_epi).toLowerCase() === String(rec.tipo_epi).toLowerCase() && x.id !== rec.id;
      });
      if (dupE.length) throw new Error('Este EPI já está cadastrado para o setor.');
    }
    if (table === 'EPIs' && rec.data_entrega && rec.vida_util_valor && rec.vida_util_unidade) {
      rec.data_vencimento = addPeriod_(rec.data_entrega, rec.vida_util_valor, rec.vida_util_unidade);
      rec.vida_util_meses = toMonths_(rec.vida_util_valor, rec.vida_util_unidade);
    }
    if (table === 'Treinamentos') {
      if (rec.validade_valor && rec.validade_unidade) rec.validade_meses = toMonths_(rec.validade_valor, rec.validade_unidade);
      else { rec.validade_valor = ''; rec.validade_unidade = ''; rec.validade_meses = ''; }
      if (rec.ativo === '' || rec.ativo === undefined) rec.ativo = true;
      if (isNew && (rec.concluido === '' || rec.concluido === undefined)) rec.concluido = false;
    }

    if (isNew) {
      rec.id = uuid_();
      if (SCHEMA[table].created_at) rec.created_at = now;
      if (SCHEMA[table].updated_at) rec.updated_at = now;
      insertRow_(table, rec);
      // Ao criar treinamento com data/horário, agenda no calendário automaticamente
      if (table === 'Treinamentos' && rec.data_hora) {
        insertRow_('Eventos', {
          id: uuid_(), titulo: rec.nome, tipo: rec.tipo === 'palestra' ? 'palestra' : 'treinamento',
          data_inicio: rec.data_hora, local: rec.local || '', treinamento_id: rec.id, created_at: now
        });
      }
    } else {
      if (SCHEMA[table].updated_at) rec.updated_at = now;
      delete rec.created_at;
      updateRow_(table, rec.id, rec);
    }
  });
}

function removeRecord_(table, id) {
  if (DELETABLE.indexOf(table) < 0) throw new Error('Exclusão não permitida para ' + table);
  withLock_(function () { deleteRows_(table, function (r) { return r.id === id; }); });
}

/** Concluir treinamento: registra participantes, atualiza NRs e marca como concluído */
function concluirTreinamento_(treinamentoId, colabIds, data) {
  if (!colabIds || !colabIds.length) throw new Error('Selecione ao menos um participante.');
  if (!data) throw new Error('Informe a data de conclusão.');
  withLock_(function () {
    var t = readTable_('Treinamentos').filter(function (x) { return x.id === treinamentoId; })[0];
    if (!t) throw new Error('Treinamento não encontrado.');
    var venc = vencTreinamento_(t.id, data);
    var now = nowIso_();
    var cnrs = readTable_('ColaboradorNRs');
    var rows = colabIds.map(function (cid) {
      return { id: uuid_(), colaborador_id: cid, treinamento_id: t.id, data_realizacao: data, data_vencimento: venc,
        instrutor: t.instrutor || '', local: t.local || '', created_at: now };
    });
    insertRows_('TreinamentosRealizados', rows);
    if (t.nr_id) {
      colabIds.forEach(function (cid) {
        var ex = cnrs.filter(function (x) { return x.colaborador_id === cid && x.nr_id === t.nr_id; })[0];
        if (ex) updateRow_('ColaboradorNRs', ex.id, { data_realizacao: data, data_vencimento: venc, updated_at: now });
        else insertRow_('ColaboradorNRs', { id: uuid_(), colaborador_id: cid, nr_id: t.nr_id, data_realizacao: data,
          data_vencimento: venc, created_at: now, updated_at: now });
      });
    }
    updateRow_('Treinamentos', t.id, { concluido: true, data_conclusao: data });
  });
}

function saveConfig_(rec) {
  rec = clean_('Configuracoes', rec || {});
  if (!rec.nome_empresa) throw new Error('Informe o nome da empresa.');
  withLock_(function () {
    var cur = readTable_('Configuracoes')[0];
    rec.updated_at = nowIso_();
    if (cur) { delete rec.id; updateRow_('Configuracoes', cur.id, rec); }
    else { rec.id = uuid_(); insertRow_('Configuracoes', rec); }
  });
}

/** Matrícula sequencial por ano de cadastro: AAAA + 4 dígitos (ex.: 20260001) */
function gerarMatricula_() {
  var ano = String(new Date().getFullYear());
  var max = 0;
  readTable_('Colaboradores').forEach(function (c) {
    var m = String(c.matricula || '');
    if (m.length === 8 && m.indexOf(ano) === 0) max = Math.max(max, parseInt(m.slice(4), 10) || 0);
  });
  var seq = String(max + 1);
  while (seq.length < 4) seq = '0' + seq;
  return ano + seq;
}

// Vencimento: validade do treinamento (dias/meses/anos) ou periodicidade da NR
function vencTreinamento_(treinamentoId, dataReal) {
  var t = readTable_('Treinamentos').filter(function (x) { return x.id === treinamentoId; })[0];
  if (!t) return '';
  if (t.validade_valor && t.validade_unidade) return addPeriod_(dataReal, t.validade_valor, t.validade_unidade);
  var meses = t.validade_meses;
  if (!meses && t.nr_id) {
    var nr = readTable_('NormasNR').filter(function (n) { return n.id === t.nr_id; })[0];
    meses = nr && nr.periodicidade_meses;
  }
  return meses ? addPeriod_(dataReal, meses, 'meses') : '';
}

function vencNr_(nrId, dataReal) {
  var nr = readTable_('NormasNR').filter(function (n) { return n.id === nrId; })[0];
  return nr && nr.periodicidade_meses ? addPeriod_(dataReal, nr.periodicidade_meses, 'meses') : '';
}

/** Soma período a uma data AAAA-MM-DD (fim de mês ajustado como no PostgreSQL) */
function addPeriod_(iso, valor, unidade) {
  var p = String(iso).slice(0, 10).split('-').map(Number);
  var v = Number(valor);
  if (!p[0] || !v) return '';
  if (unidade === 'dias') {
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + v));
    return d.toISOString().slice(0, 10);
  }
  var months = unidade === 'anos' ? v * 12 : v;
  var total = (p[1] - 1) + months;
  var y = p[0] + Math.floor(total / 12), m = ((total % 12) + 12) % 12;
  var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  var day = Math.min(p[2], last);
  return y + '-' + pad_(m + 1) + '-' + pad_(day);
}

function toMonths_(valor, unidade) {
  valor = Number(valor);
  if (!valor) return '';
  if (unidade === 'anos') return valor * 12;
  if (unidade === 'dias') return Math.max(1, Math.round(valor / 30));
  return valor;
}

// ============================================================
// CONSULTA PÚBLICA (QR Code)
// ============================================================
function qrData_(token) {
  var c = readTable_('Colaboradores').filter(function (x) { return x.qrcode_token === token; })[0];
  if (!c) return { notFound: true };
  var trein = indexBy_(readTable_('Treinamentos'));
  var nrs = indexBy_(readTable_('NormasNR'));
  var tr = readTable_('TreinamentosRealizados').filter(function (x) { return x.colaborador_id === c.id; })
    .sort(function (a, b) { return String(b.data_realizacao).localeCompare(String(a.data_realizacao)); })
    .map(function (x) {
      var t = trein[x.treinamento_id] || {};
      return { nome: t.nome || '—', nr: (nrs[t.nr_id] || {}).codigo || '', data_realizacao: x.data_realizacao, data_vencimento: x.data_vencimento };
    });
  var cnr = readTable_('ColaboradorNRs').filter(function (x) { return x.colaborador_id === c.id; }).map(function (x) {
    var n = nrs[x.nr_id] || {};
    return { codigo: n.codigo || '', titulo: n.titulo || '', data_realizacao: x.data_realizacao, data_vencimento: x.data_vencimento };
  });
  var cfg = readTable_('Configuracoes')[0] || {};
  return {
    c: { matricula: c.matricula, nome: c.nome, funcao_atual: c.funcao_atual, setor: c.setor, data_admissao: c.data_admissao },
    tr: tr, cnr: cnr, empresa: cfg.nome_empresa || 'TEC - SST', logo_url: cfg.logo_url || ''
  };
}

// ============================================================
// EXPORTAÇÃO PARA PLANILHA GOOGLE
// ============================================================
function exportSheet_(title, headers, rows) {
  var ss = SpreadsheetApp.create(title + ' — ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));
  var sh = ss.getSheets()[0];
  var values = [headers].concat(rows || []);
  sh.getRange(1, 1, values.length, headers.length).setNumberFormat('@').setValues(values);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#16a34a').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, headers.length);
  return ss.getUrl();
}

// ============================================================
// CAMADA DE DADOS (planilha)
// ============================================================
var _cache = {};
var _ss = null;

function ss_() {
  if (_ss) return _ss;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) return (_ss = SpreadsheetApp.openById(id));
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (active) return (_ss = active);
  // Projeto independente (não vinculado): cria a planilha no seu Drive uma única vez
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    id = props.getProperty('SPREADSHEET_ID');
    if (id) return (_ss = SpreadsheetApp.openById(id));
    var novo = SpreadsheetApp.create('SST Safe Zone - Banco de dados');
    props.setProperty('SPREADSHEET_ID', novo.getId());
    return (_ss = novo);
  } finally { lock.releaseLock(); }
}

function sheet_(table) {
  var sh = ss_().getSheetByName(table);
  if (!sh) throw new Error('Aba ' + table + ' não encontrada. Rode "Preparar planilha".');
  return sh;
}

function readTable_(table) {
  if (_cache[table]) return _cache[table];
  var sh = sheet_(table);
  var values = sh.getDataRange().getValues();
  var header = values.shift() || [];
  var types = SCHEMA[table];
  var tz = Session.getScriptTimeZone();
  var out = [];
  values.forEach(function (row) {
    if (!row[0]) return;
    var o = {};
    header.forEach(function (h, i) {
      if (!types[h]) return;
      var v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, h === 'data_hora' || h === 'data_inicio' || h === 'data_fim' ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
      if (types[h] === 'n') v = (v === '' || v === null) ? null : Number(v);
      else if (types[h] === 'b') v = (v === true || String(v).toLowerCase() === 'true');
      else v = (v === null || v === undefined) ? '' : String(v);
      o[h] = v;
    });
    out.push(o);
  });
  _cache[table] = out;
  return out;
}

function loadAll_() {
  var db = {};
  APP_TABLES.forEach(function (t) { db[t] = readTable_(t); });
  return db;
}

function toRow_(table, header, rec) {
  return header.map(function (h) {
    var v = rec[h];
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  });
}

function insertRow_(table, rec) { insertRows_(table, [rec]); }

function insertRows_(table, recs) {
  if (!recs.length) return;
  var sh = sheet_(table);
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows = recs.map(function (r) { return toRow_(table, header, r); });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, header.length).setNumberFormat('@').setValues(rows);
  delete _cache[table];
}

function updateRow_(table, id, patch) {
  var sh = sheet_(table);
  var values = sh.getDataRange().getValues();
  var header = values[0];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      var current = {};
      header.forEach(function (h, j) { current[h] = values[i][j] instanceof Date ? readTable_(table).filter(function (r) { return r.id === id; })[0][h] : values[i][j]; });
      Object.keys(patch).forEach(function (k) { if (k !== 'id' && SCHEMA[table][k]) current[k] = patch[k]; });
      sh.getRange(i + 1, 1, 1, header.length).setNumberFormat('@').setValues([toRow_(table, header, current)]);
      delete _cache[table];
      return;
    }
  }
  throw new Error('Registro não encontrado.');
}

function deleteRows_(table, predicate) {
  var rows = readTable_(table);
  var sh = sheet_(table);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (predicate(rows[i])) {
      // localizar linha física pelo id (linhas vazias são ignoradas na leitura)
      var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
      for (var j = ids.length - 1; j >= 0; j--) {
        if (String(ids[j][0]) === String(rows[i].id)) { sh.deleteRow(j + 2); break; }
      }
    }
  }
  delete _cache[table];
}

/** Mantém só os campos do esquema e converte tipos vindos do formulário */
function clean_(table, rec) {
  var types = SCHEMA[table], out = {};
  Object.keys(rec).forEach(function (k) {
    if (!types[k]) return;
    var v = rec[k];
    if (v === null || v === undefined) v = '';
    if (types[k] === 'n') v = (v === '' ? '' : Number(v));
    else if (types[k] === 'b') v = (v === true || v === 'true');
    else if (Array.isArray(v)) v = v.join(',');
    else v = String(v).trim();
    out[k] = v;
  });
  return out;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { _cache = {}; return fn(); } finally { lock.releaseLock(); }
}

function indexBy_(arr) { var m = {}; arr.forEach(function (x) { m[x.id] = x; }); return m; }
function uuid_() { return Utilities.getUuid(); }
function nowIso_() { return new Date().toISOString(); }
function pad_(n) { return (n < 10 ? '0' : '') + n; }

// ============================================================
// PREPARAÇÃO DA PLANILHA (abas, cabeçalhos e NRs)
// ============================================================
function ensureSetup_(force) {
  var props = PropertiesService.getScriptProperties();
  if (!force && props.getProperty('SETUP_V2') === 'ok') return;
  var ss = ss_();
  migrarV2_(ss);
  Object.keys(SCHEMA).forEach(function (table) {
    var cols = Object.keys(SCHEMA[table]);
    var sh = ss.getSheetByName(table);
    if (!sh) {
      sh = ss.insertSheet(table);
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#1f2a24').setFontColor('#ffffff');
      sh.setFrozenRows(1);
      sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), cols.length).setNumberFormat('@');
    } else {
      // acrescenta colunas novas, se faltarem
      var header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
      cols.forEach(function (c) {
        if (header.indexOf(c) < 0) {
          var col = sh.getLastColumn() + 1;
          sh.getRange(1, col).setValue(c).setFontWeight('bold').setBackground('#1f2a24').setFontColor('#ffffff');
          header.push(c);
        }
      });
    }
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Página1') || ss.getSheetByName('Planilha1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  _cache = {};
  if (readTable_('NormasNR').length === 0) seedNRs_();
  if (readTable_('Configuracoes').length === 0) {
    insertRow_('Configuracoes', { id: uuid_(), nome_empresa: 'TEC - SST', updated_at: nowIso_() });
  }
  props.setProperty('SETUP_V2', 'ok');
  // matrícula para colaboradores cadastrados antes desta versão
  var semMatricula = readTable_('Colaboradores').filter(function (c) { return !c.matricula; })
    .sort(function (a, b) { return String(a.created_at).localeCompare(String(b.created_at)); });
  semMatricula.forEach(function (c) { updateRow_('Colaboradores', c.id, { matricula: gerarMatricula_() }); _cache = {}; });
}

/** Versão 2: "Fornecedores" passa a se chamar "Parceiros" (mantendo os dados) */
function migrarV2_(ss) {
  var antiga = ss.getSheetByName('Fornecedores');
  if (antiga && !ss.getSheetByName('Parceiros')) antiga.setName('Parceiros');
  var tr = ss.getSheetByName('Treinamentos');
  if (tr && tr.getLastColumn() > 0) {
    var header = tr.getRange(1, 1, 1, tr.getLastColumn()).getValues()[0];
    var i = header.indexOf('fornecedor_id');
    if (i >= 0 && header.indexOf('parceiro_id') < 0) tr.getRange(1, i + 1).setValue('parceiro_id');
  }
}

function nrLink_(codigo) {
  var n = parseInt(String(codigo).replace(/\D/g, ''), 10);
  if (n === 37) return 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/ctpp-nrs/norma-regulamentadora-no-37-nr-37';
  return 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-' + n + '-nr-' + n;
}

/** NRs no estado final do banco original (após todas as migrações) */
function seedNRs_() {
  // [codigo, titulo, resumo, periodicidade_meses, carga_horaria_minima]
  var nrs = [
    ['NR-01', 'Disposições Gerais e Gerenciamento de Riscos Ocupacionais', 'Estabelece disposições gerais sobre SST e o GRO.', 12, 2],
    ['NR-02', 'Inspeção Prévia', '', null, null],
    ['NR-03', 'Embargo e Interdição', 'Procedimentos de embargo e interdição.', null, null],
    ['NR-04', 'SESMT', 'Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho.', null, null],
    ['NR-05', 'CIPA', 'Comissão Interna de Prevenção de Acidentes.', 12, 20],
    ['NR-06', 'Equipamento de Proteção Individual - EPI', 'Equipamento de Proteção Individual.', null, null],
    ['NR-07', 'PCMSO', 'Programa de Controle Médico de Saúde Ocupacional.', 12, null],
    ['NR-08', 'Edificações', 'Requisitos técnicos mínimos das edificações.', null, null],
    ['NR-09', 'Avaliação e Controle das Exposições Ocupacionais', 'Agentes físicos, químicos e biológicos.', 12, null],
    ['NR-10', 'Segurança em Instalações e Serviços em Eletricidade', 'Serviços em eletricidade.', 24, 40],
    ['NR-11', 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais', '', 12, 16],
    ['NR-12', 'Segurança no Trabalho em Máquinas e Equipamentos', 'Segurança em máquinas.', 24, 8],
    ['NR-13', 'Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos', '', null, null],
    ['NR-14', 'Fornos', '', null, null],
    ['NR-15', 'Atividades e Operações Insalubres', '', null, null],
    ['NR-16', 'Atividades e Operações Perigosas', '', null, null],
    ['NR-17', 'Ergonomia', 'Adaptação das condições de trabalho.', null, null],
    ['NR-18', 'SST na Indústria da Construção', 'Condições e meio ambiente de trabalho.', 12, 8],
    ['NR-19', 'Explosivos', '', null, null],
    ['NR-20', 'Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis', 'Segurança com inflamáveis.', 36, 4],
    ['NR-21', 'Trabalhos a Céu Aberto', '', null, null],
    ['NR-22', 'SST na Mineração', '', null, null],
    ['NR-23', 'Proteção Contra Incêndios', '', 12, 4],
    ['NR-24', 'Condições Sanitárias e de Conforto', '', null, null],
    ['NR-25', 'Resíduos Industriais', '', null, null],
    ['NR-26', 'Sinalização de Segurança', '', null, null],
    ['NR-28', 'Fiscalização e Penalidades', '', null, null],
    ['NR-29', 'SST Portuário', '', null, null],
    ['NR-30', 'SST Aquaviário', '', null, null],
    ['NR-31', 'SST Agricultura e Silvicultura', '', null, null],
    ['NR-32', 'SST em Serviços de Saúde', '', null, null],
    ['NR-33', 'Espaços Confinados', 'Trabalho em espaços confinados.', 12, 16],
    ['NR-34', 'Indústria da Construção e Reparação Naval', '', null, null],
    ['NR-35', 'Trabalho em Altura', 'Trabalho acima de 2m.', 24, 8],
    ['NR-36', 'Abate e Processamento de Carnes', '', null, null],
    ['NR-37', 'Plataformas de Petróleo', '', null, null],
    ['NR-38', 'Limpeza Urbana e Resíduos Sólidos', '', null, null]
  ];
  var now = nowIso_();
  insertRows_('NormasNR', nrs.map(function (n) {
    return { id: uuid_(), codigo: n[0], titulo: n[1], resumo: n[2], periodicidade_meses: n[3], carga_horaria_minima: n[4],
      link_oficial: nrLink_(n[0]), created_at: now };
  }));
}
