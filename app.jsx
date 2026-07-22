const { useState, useEffect, useRef } = React;

// Acesso seguro às globais do Lucide Icons
const Lucide = window.LucideReact || window.lucideReact || window.lucide || {};
const getIcon = (name) => Lucide[name] || Lucide[name + 'Icon'] || (() => null);

// Ícones utilizados no app
const Download = getIcon('Download');
const Plus = getIcon('Plus');
const Trash2 = getIcon('Trash2');
const Users = getIcon('Users');
const MapPin = getIcon('MapPin');
const Camera = getIcon('Camera');
const X = getIcon('X');
const Edit2 = getIcon('Edit2');
const Save = getIcon('Save');
const Home = getIcon('Home');
const BarChart3 = getIcon('BarChart3');
const PieChart = getIcon('PieChart');

// Função auxiliar para comprimir imagem diretamente para Base64 (sem precisar do Firebase Storage)
function comprimirFotoParaBase64(dataUrl, larguraMaxima = 1024, qualidade = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      let largura = img.width;
      let altura = img.height;
      if (largura > larguraMaxima) {
        altura = Math.round((altura * larguraMaxima) / largura);
        largura = larguraMaxima;
      }
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, largura, altura);
      resolve(canvas.toDataURL("image/jpeg", qualidade));
    };
    img.onerror = (err) => reject(err);
  });
}

function MedicaoCanteiroPro() {
  const [obras, setObras] = useState([]);
  const [obraAtiva, setObraAtiva] = useState(null);
  const [novoNomeObra, setNovoNomeObra] = useState('');
  const [empreiteiros, setEmpreiteiros] = useState([]);
  const [novoEmpreiteiro, setNovoEmpreiteiro] = useState('');
  const [categorias, setCategorias] = useState([
    'Estrutura',
    'Fundação',
    'Alvenaria',
    'Cobertura',
    'Hidrossanitário',
    'Elétrica',
    'Gesso/Drywall',
    'Esquadrias',
    'Revestimentos',
    'Pintura',
    'Pavimentação',
    'Urbanização',
    'PPCI',
    'Limpeza Final'
  ]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [categoriaSimilar, setCategoriaSimilar] = useState(null);
  const [categoriaRecemCriada, setCategoriaRecemCriada] = useState(null);
  const [expandido, setExpandido] = useState(null);

  // Função para detectar similaridade entre strings
  const detectarSimilaridade = (texto1, texto2) => {
    const normalizar = (str) => str.toLowerCase().trim();
    const t1 = normalizar(texto1);
    const t2 = normalizar(texto2);

    if (t1 === t2) return 100;
    if (t1.includes(t2) || t2.includes(t1)) return 85;

    const palavras1 = t1.split(/\s+/);
    const palavras2 = t2.split(/\s+/);
    const palavrasComuns = palavras1.filter(p => palavras2.includes(p)).length;
    if (palavrasComuns > 0) return 70 + (palavrasComuns * 10);

    return 0;
  };

  const verificarCategoriaSimilar = (novoTexto) => {
    setNovaCategoria(novoTexto);
    if (novoTexto.trim().length === 0) {
      setCategoriaSimilar(null);
      return;
    }

    const similaridades = categorias.map(cat => ({
      categoria: cat,
      similaridade: detectarSimilaridade(novoTexto, cat)
    })).filter(s => s.similaridade > 0);

    if (similaridades.length > 0) {
      setCategoriaSimilar(similaridades.sort((a, b) => b.similaridade - a.similaridade)[0]);
    } else {
      setCategoriaSimilar(null);
    }
  };

  const [empreiteiroEditando, setEmpreiteiroEditando] = useState(null);
  const [medicaoAberta, setMedicaoAberta] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);

  const [editandoMeta, setEditandoMeta] = useState(null);
  const [novaMetaValor, setNovaMetaValor] = useState('');

  // Câmera
  const [cameraAberta, setCameraAberta] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [telaAtiva, setTelaAtiva] = useState('obras');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [permissaoCameraStatus, setPermissaoCameraStatus] = useState('nao-verificada');
  const [tipoGrafico, setTipoGrafico] = useState('barras');

  const [carregandoNuvem, setCarregandoNuvem] = useState(true);
  const [statusNuvem, setStatusNuvem] = useState('conectando');

  const [servicoForm, setServicoForm] = useState({
    nome: '',
    categoria: 'Estrutura',
    metaTipo: 'area',
    metaValor: '',
    unidade: 'm²'
  });

  const [medicaoForm, setMedicaoForm] = useState({
    servicoId: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    funcionarios: '',
    observacao: '',
    fotos: [],
    justificativaExtrapolacao: ''
  });

  const cores = ['#d97757', '#c9a36b', '#7b68a6', '#4a90a4', '#6b9b6e', '#a86d4f'];

  const CORES_CATEGORIA = {
    'Estrutura': '#8b5cf6',
    'Fundação': '#6366f1',
    'Alvenaria': '#f97316',
    'Cobertura': '#0ea5e9',
    'Hidrossanitário': '#06b6d4',
    'Elétrica': '#eab308',
    'Gesso/Drywall': '#a8a29e',
    'Esquadrias': '#78716c',
    'Revestimentos': '#ec4899',
    'Pintura': '#d946ef',
    'Pavimentação': '#64748b',
    'Urbanização': '#16a34a',
    'PPCI': '#dc2626',
    'Limpeza Final': '#14b8a6'
  };
  const PALETA_FALLBACK = ['#d97757', '#7b68a6', '#4a90a4', '#6b9b6e', '#c9a36b', '#a86d4f', '#0ea5e9', '#ec4899'];

  const getCorCategoria = (categoria) => {
    if (CORES_CATEGORIA[categoria]) return CORES_CATEGORIA[categoria];
    let hash = 0;
    for (let i = 0; i < categoria.length; i++) hash = categoria.charCodeAt(i) + ((hash << 5) - hash);
    return PALETA_FALLBACK[Math.abs(hash) % PALETA_FALLBACK.length];
  };

  const BadgeStatusNuvem = () => {
    const config = {
      conectando: { texto: '☁️ Conectando...', cor: '#9ca3af' },
      salvando: { texto: '☁️ Salvando...', cor: '#f59e0b' },
      ok: { texto: '☁️ Sincronizado', cor: '#22c55e' },
      erro: { texto: '⚠️ Sem conexão com a nuvem', cor: '#ef4444' }
    }[statusNuvem] || { texto: '☁️', cor: '#9ca3af' };

    return (
      <span
        className="text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1"
        style={{ backgroundColor: config.cor + '30', color: config.cor }}
      >
        {config.texto}
      </span>
    );
  };

  // Carregar dados via Firestore CDN
  useEffect(() => {
    let unsubscribe = () => {};

    if (window.db) {
      unsubscribe = window.db.collection('medicaoCanteiroPro').doc('appData').onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            setObras(data.obras || []);
            setCategorias(data.categorias || [
              'Estrutura', 'Fundação', 'Alvenaria', 'Cobertura', 'Hidrossanitário',
              'Elétrica', 'Gesso/Drywall', 'Esquadrias', 'Revestimentos', 'Pintura',
              'Pavimentação', 'Urbanização', 'PPCI', 'Limpeza Final'
            ]);
          }
          setStatusNuvem('ok');
          setCarregandoNuvem(false);
        },
        (err) => {
          console.error('Erro ao carregar dados do Firestore:', err);
          setStatusNuvem('erro');
          setCarregandoNuvem(false);
        }
      );
    } else {
      console.warn('window.db não encontrado. Verifique a inicialização no index.html.');
      setStatusNuvem('erro');
      setCarregandoNuvem(false);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocalizacao({
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
        },
        () => console.log('Localização não disponível')
      );
    }

    solicitarPermissaoCameraUnicaVez();
    return () => unsubscribe();
  }, []);

  const solicitarPermissaoCameraUnicaVez = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissaoCameraStatus('nao-disponivel');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setPermissaoCameraStatus('concedida');
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissaoCameraStatus('negada');
      } else {
        setPermissaoCameraStatus('nao-disponivel');
      }
    }
  };

  const salvarDados = (novasObras, categoriasParaSalvar) => {
    const dadosParaSalvar = {
      obras: novasObras,
      categorias: categoriasParaSalvar !== undefined ? categoriasParaSalvar : categorias
    };

    if (!window.db) {
      setStatusNuvem('erro');
      return;
    }

    setStatusNuvem('salvando');
    window.db.collection('medicaoCanteiroPro').doc('appData').set(dadosParaSalvar)
      .then(() => setStatusNuvem('ok'))
      .catch((err) => {
        console.error('Erro ao salvar no Firestore:', err);
        setStatusNuvem('erro');
      });
  };

  const adicionarCategoria = () => {
    if (!novaCategoria.trim()) return;
    const normalizadaNova = novaCategoria.toLowerCase().trim();
    if (categorias.some(cat => cat.toLowerCase().trim() === normalizadaNova)) {
      alert('❌ Esta categoria já existe!');
      return;
    }

    const newCategorias = [...categorias, novaCategoria];
    setCategorias(newCategorias);
    setCategoriaRecemCriada(novaCategoria);
    setServicoForm({ ...servicoForm, categoria: novaCategoria });
    setNovaCategoria('');
    setCategoriaSimilar(null);
    salvarDados(obras, newCategorias);
    setTimeout(() => setCategoriaRecemCriada(null), 3000);
  };

  const deletarCategoria = (cat) => {
    const newCategorias = categorias.filter(c => c !== cat);
    setCategorias(newCategorias);
    salvarDados(obras, newCategorias);
  };

  const criarObra = () => {
    if (!novoNomeObra.trim()) return;
    const novaObra = {
      id: Date.now(),
      nome: novoNomeObra,
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      empreiteiros: []
    };
    const novasObras = [...obras, novaObra];
    setObras(novasObras);
    salvarDados(novasObras);
    setObraAtiva(novaObra.id);
    setEmpreiteiros([]);
    setNovoNomeObra('');
  };

  useEffect(() => {
    if (!obraAtiva) return;
    const timeout = setTimeout(() => {
      setObras(prevObras => {
        const novasObras = prevObras.map(o => (o.id === obraAtiva ? { ...o, empreiteiros } : o));
        salvarDados(novasObras);
        return novasObras;
      });
    }, 800);
    return () => clearTimeout(timeout);
  }, [empreiteiros]);

  const entrarObra = (obraId) => {
    setObraAtiva(obraId);
    const obra = obras.find(o => o.id === obraId);
    if (obra) {
      setEmpreiteiros(obra.empreiteiros || []);
    }
  };

  const voltarDashboard = () => {
    const obraAtualObj = obras.find(o => o.id === obraAtiva);
    if (obraAtualObj) {
      const novasObras = obras.map(o => o.id === obraAtiva ? { ...o, empreiteiros } : o);
      setObras(novasObras);
      salvarDados(novasObras);
    }
    setObraAtiva(null);
    setEmpreiteiros([]);
    setTelaAtiva('obras');
  };

  const deletarObra = (obraId) => {
    if (confirm('Tem certeza que deseja deletar esta obra?')) {
      const novasObras = obras.filter(o => o.id !== obraId);
      setObras(novasObras);
      salvarDados(novasObras);
    }
  };

  const adicionarEmpreiteiro = () => {
    if (!novoEmpreiteiro.trim()) return;
    const newEmpreiteiro = {
      id: Date.now(),
      nome: novoEmpreiteiro,
      cor: cores[empreiteiros.length % cores.length],
      servicos: [],
      dataCriacao: new Date().toLocaleDateString('pt-BR')
    };
    setEmpreiteiros([...empreiteiros, newEmpreiteiro]);
    setNovoEmpreiteiro('');
  };

  const adicionarServico = (empreiteiroId) => {
    if (!servicoForm.nome.trim() || !servicoForm.metaValor) return;

    const newEmpreiteiros = empreiteiros.map(e => {
      if (e.id === empreiteiroId) {
        return {
          ...e,
          servicos: [
            ...e.servicos,
            {
              id: Date.now(),
              nome: servicoForm.nome,
              categoria: servicoForm.categoria,
              metaTipo: servicoForm.metaTipo,
              metaValor: parseFloat(servicoForm.metaValor),
              unidade: servicoForm.unidade,
              medicoes: []
            }
          ]
        };
      }
      return e;
    });

    setEmpreiteiros(newEmpreiteiros);
    setServicoForm({ nome: '', categoria: 'Estrutura', metaTipo: 'area', metaValor: '', unidade: 'm²' });
    setExpandido(null);
  };

  const iniciarCamera = async (servicoId) => {
    try {
      if (permissaoCameraStatus !== 'concedida') {
        alert('Permissão de câmera não foi concedida.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      streamRef.current = stream;
      setCameraAberta(servicoId);
    } catch (err) {
      alert('❌ Erro ao acessar câmera: ' + err.message);
    }
  };

  useEffect(() => {
    if (cameraAberta && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraAberta]);

  const capturarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      setFotoCapturada(canvasRef.current.toDataURL('image/jpeg'));
    }
  };

  // Processamento e salvamento de fotos diretamente via Base64 Comprimido no Firestore
  const adicionarFotoMedicao = async () => {
    if (!fotoCapturada) return;

    const agora = new Date();
    const idFoto = Date.now();
    setEnviandoFoto(true);

    try {
      const fotoBase64Comprimida = await comprimirFotoParaBase64(fotoCapturada, 1024, 0.7);

      const novaFoto = {
        id: idFoto,
        imagem: fotoBase64Comprimida,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR'),
        gps: localizacao
      };

      setMedicaoForm(prev => ({
        ...prev,
        fotos: [...prev.fotos, novaFoto]
      }));
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('❌ Erro ao processar foto.');
    } finally {
      setEnviandoFoto(false);
      setFotoCapturada(null);
      fecharCamera();
    }
  };

  const fecharCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraAberta(null);
  };

  const removerFoto = (fotoId) => {
    setMedicaoForm({
      ...medicaoForm,
      fotos: medicaoForm.fotos.filter(f => f.id !== fotoId)
    });
  };

  const verificarExtrapolacao = (servico, valorInformado) => {
    const medidoAtual = servico.medicoes.reduce((sum, m) => sum + m.valor, 0);
    const faltam = servico.metaValor - medidoAtual;
    const excedente = valorInformado - faltam;
    return {
      extrapola: excedente > 0,
      faltam,
      excedente
    };
  };

  const adicionarMedicaoParcial = (empreiteiroId, servicoId) => {
    if (!medicaoForm.valor) return false;

    const emp = empreiteiros.find(e => e.id === empreiteiroId);
    const servico = emp?.servicos.find(s => s.id === servicoId);
    if (!servico) return false;

    const valorInformado = parseFloat(medicaoForm.valor);
    const { extrapola, excedente } = verificarExtrapolacao(servico, valorInformado);

    if (extrapola && !medicaoForm.justificativaExtrapolacao.trim()) {
      alert(`⚠️ Esta medição extrapola a meta em ${excedente.toFixed(2)} ${servico.unidade}.\n\nÉ obrigatório justificar a extrapolação.`);
      return false;
    }

    const newEmpreiteiros = empreiteiros.map(e => {
      if (e.id === empreiteiroId) {
        return {
          ...e,
          servicos: e.servicos.map(s => {
            if (s.id === servicoId) {
              return {
                ...s,
                medicoes: [
                  ...s.medicoes,
                  {
                    id: Date.now(),
                    valor: valorInformado,
                    data: medicaoForm.data,
                    funcionarios: medicaoForm.funcionarios ? parseInt(medicaoForm.funcionarios) : 0,
                    observacao: medicaoForm.observacao,
                    fotos: medicaoForm.fotos,
                    extrapolou: extrapola,
                    justificativaExtrapolacao: extrapola ? medicaoForm.justificativaExtrapolacao : ''
                  }
                ]
              };
            }
            return s;
          })
        };
      }
      return e;
    });

    setEmpreiteiros(newEmpreiteiros);
    setMedicaoForm({
      servicoId: '',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      funcionarios: '',
      observacao: '',
      fotos: [],
      justificativaExtrapolacao: ''
    });
    return true;
  };

  const deletarMedicao = (empreiteiroId, servicoId, medicaoId) => {
    setEmpreiteiros(empreiteiros.map(e => {
      if (e.id === empreiteiroId) {
        return {
          ...e,
          servicos: e.servicos.map(s => {
            if (s.id === servicoId) {
              return { ...s, medicoes: s.medicoes.filter(m => m.id !== medicaoId) };
            }
            return s;
          })
        };
      }
      return e;
    }));
  };

  const deletarEmpreiteiro = (id) => {
    setEmpreiteiros(empreiteiros.filter(e => e.id !== id));
  };

  const deletarServico = (empreiteiroId, servicoId) => {
    setEmpreiteiros(empreiteiros.map(e => {
      if (e.id === empreiteiroId) {
        return { ...e, servicos: e.servicos.filter(s => s.id !== servicoId) };
      }
      return e;
    }));
  };

  const calcularProgresso = (servico) => {
    const medido = servico.medicoes.reduce((sum, m) => sum + m.valor, 0);
    const percentual = (medido / servico.metaValor) * 100;
    return {
      medido: medido.toFixed(2),
      faltam: Math.max(0, (servico.metaValor - medido).toFixed(2)),
      percentual: Math.min(100, Math.round(percentual)),
      completo: percentual >= 100
    };
  };

  const calcularProgressoTotal = () => {
    let totalMeta = 0;
    let totalMedido = 0;
    let servicosCompletos = 0;
    let totalServicos = 0;

    empreiteiros.forEach(emp => {
      emp.servicos.forEach(serv => {
        totalMeta += serv.metaValor;
        const medido = serv.medicoes.reduce((sum, m) => sum + m.valor, 0);
        totalMedido += medido;
        totalServicos++;
        if (medido >= serv.metaValor) servicosCompletos++;
      });
    });

    return {
      totalMeta,
      totalMedido,
      percentualTotal: totalMeta > 0 ? Math.round((totalMedido / totalMeta) * 100) : 0,
      servicosCompletos,
      totalServicos
    };
  };

  const exportarRelatorio = () => {
    const obraAtualObj = obras.find(o => o.id === obraAtiva);
    if (!obraAtualObj) return;

    let csv = 'RELATÓRIO DE MEDIÇÕES\n';
    csv += `Projeto: ${obraAtualObj.nome}\n`;
    csv += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    const progTotal = calcularProgressoTotal();
    csv += `PROGRESSO TOTAL DA OBRA: ${progTotal.percentualTotal}%\n\n`;

    empreiteiros.forEach(emp => {
      csv += `\n=== EMPREITEIRO: ${emp.nome} ===\n`;
      csv += 'Serviço,Categoria,Meta,Unidade,Medido,Progresso\n';

      emp.servicos.forEach(serv => {
        const prog = calcularProgresso(serv);
        csv += `"${serv.nome}","${serv.categoria}",${serv.metaValor},"${serv.unidade}",${prog.medido},${prog.percentual}%\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `medicao_${obraAtualObj.nome.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RENDERIZAÇÃO DA INTERFACE DENTRO DO REACT
  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-800">
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-600" />
            Medi-o Eng
          </h1>
          <p className="text-xs text-slate-500">Gestão e Medição de Canteiro de Obras</p>
        </div>
        <BadgeStatusNuvem />
      </header>

      {/* TELA 1: SELEÇÃO DE OBRAS */}
      {!obraAtiva && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <h2 className="font-semibold text-slate-700">Nova Obra / Projeto</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome do projeto (ex: RESIDENCIAL SOLAR)"
                value={novoNomeObra}
                onChange={(e) => setNovoNomeObra(e.target.value)}
                className="flex-1 p-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={criarObra}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Criar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-slate-700">Seus Projetos</h2>
            {obras.length === 0 ? (
              <p className="text-sm text-slate-400 bg-white p-4 rounded-xl text-center">Nenhum projeto cadastrado.</p>
            ) : (
              obras.map(obra => (
                <div key={obra.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">{obra.nome}</h3>
                    <span className="text-xs text-slate-400">Criado em: {obra.dataCriacao}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => entrarObra(obra.id)}
                      className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => deletarObra(obra.id)}
                      className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TELA 2: GESTÃO DA OBRA SELECIONADA */}
      {obraAtiva && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
            <button
              onClick={voltarDashboard}
              className="text-xs bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Voltar aos projetos
            </button>
            <button
              onClick={exportarRelatorio}
              className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Relatório
            </button>
          </div>

          {/* Cadastro de Empreiteiro */}
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <h2 className="font-semibold text-slate-700 text-sm">Adicionar Empreiteiro / Equipe</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da equipe/empreiteiro"
                value={novoEmpreiteiro}
                onChange={(e) => setNovoEmpreiteiro(e.target.value)}
                className="flex-1 p-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={adicionarEmpreiteiro}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de Empreiteiros e Serviços */}
          {empreiteiros.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl shadow-sm p-4 space-y-4 border-l-4" style={{ borderColor: emp.cor }}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{emp.nome}</h3>
                <button onClick={() => deletarEmpreiteiro(emp.id)} className="text-slate-400 hover:text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário Novo Serviço */}
              <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-slate-500">NOVO SERVIÇO / META</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Descrição do serviço"
                    value={servicoForm.nome}
                    onChange={(e) => setServicoForm({ ...servicoForm, nome: e.target.value })}
                    className="p-1.5 border rounded text-xs col-span-2"
                  />
                  <select
                    value={servicoForm.categoria}
                    onChange={(e) => setServicoForm({ ...servicoForm, categoria: e.target.value })}
                    className="p-1.5 border rounded text-xs"
                  >
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Meta"
                      value={servicoForm.metaValor}
                      onChange={(e) => setServicoForm({ ...servicoForm, metaValor: e.target.value })}
                      className="p-1.5 border rounded text-xs w-full"
                    />
                    <input
                      type="text"
                      placeholder="Un."
                      value={servicoForm.unidade}
                      onChange={(e) => setServicoForm({ ...servicoForm, unidade: e.target.value })}
                      className="p-1.5 border rounded text-xs w-16"
                    />
                  </div>
                </div>
                <button
                  onClick={() => adicionarServico(emp.id)}
                  className="w-full bg-slate-700 text-white py-1.5 rounded text-xs font-medium"
                >
                  Cadastrar Serviço
                </button>
              </div>

              {/* Serviços Cadastrados */}
              <div className="space-y-3">
                {emp.servicos.map(s => {
                  const prog = calcularProgresso(s);
                  return (
                    <div key={s.id} className="border p-3 rounded-lg space-y-2 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <span
                            className="text-[10px] text-white px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: getCorCategoria(s.categoria) }}
                          >
                            {s.categoria}
                          </span>
                          <h4 className="font-semibold text-sm text-slate-800 mt-1">{s.nome}</h4>
                        </div>
                        <button onClick={() => deletarServico(emp.id, s.id)} className="text-slate-300 hover:text-rose-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Progresso visual */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Medido: {prog.medido} / {s.metaValor} {s.unidade}</span>
                          <span className="font-bold">{prog.percentual}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${prog.percentual}%`, backgroundColor: getCorCategoria(s.categoria) }}
                          />
                        </div>
                      </div>

                      {/* Formulário de Medição Rápida */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder={`Qtd (${s.unidade})`}
                            value={medicaoForm.servicoId === s.id ? medicaoForm.valor : ''}
                            onChange={(e) => setMedicaoForm({ ...medicaoForm, servicoId: s.id, valor: e.target.value })}
                            className="p-1.5 border rounded text-xs w-full"
                          />
                          <button
                            onClick={() => iniciarCamera(s.id)}
                            className="p-1.5 border rounded text-xs bg-slate-50 hover:bg-slate-100"
                          >
                            <Camera className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>

                        {/* Visualização da Câmera */}
                        {cameraAberta === s.id && (
                          <div className="space-y-2 bg-slate-900 p-2 rounded-lg">
                            <video ref={videoRef} className="w-full rounded bg-black h-48 object-cover" autoPlay playsInline />
                            <canvas ref={canvasRef} className="hidden" width={1280} height={720} />
                            <div className="flex justify-between">
                              <button onClick={capturarFoto} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded">Tirar Foto</button>
                              <button onClick={fecharCamera} className="bg-slate-700 text-white text-xs px-3 py-1 rounded">Cancelar</button>
                            </div>
                          </div>
                        )}

                        {/* Preview da foto tirada */}
                        {medicaoForm.servicoId === s.id && medicaoForm.fotos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {medicaoForm.fotos.map(f => (
                              <div key={f.id} className="relative w-12 h-12 flex-shrink-0">
                                <img src={f.imagem} className="w-full h-full object-cover rounded" />
                                <button
                                  onClick={() => removerFoto(f.id)}
                                  className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => adicionarMedicaoParcial(emp.id, s.id)}
                          className="w-full bg-emerald-600 text-white py-1.5 rounded text-xs font-semibold"
                        >
                          Salvar Medição
                        </button>
                      </div>

                      {/* Histórico de Medições do Serviço */}
                      {s.medicoes.length > 0 && (
                        <div className="pt-2 text-xs space-y-1">
                          <span className="font-semibold text-slate-400">Histórico de registros:</span>
                          {s.medicoes.map(m => (
                            <div key={m.id} className="bg-slate-50 p-2 rounded flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span>{m.data} - <strong>+{m.valor} {s.unidade}</strong></span>
                                <button onClick={() => deletarMedicao(emp.id, s.id, m.id)} className="text-rose-400">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              {/* Exibição das fotos salvas na medição */}
                              {m.fotos && m.fotos.length > 0 && (
                                <div className="flex gap-1.5 mt-1 overflow-x-auto">
                                  {m.fotos.map(foto => (
                                    <img key={foto.id} src={foto.imagem} className="w-10 h-10 object-cover rounded border" />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Renderização Principal no DOM
ReactDOM.createRoot(document.getElementById('root')).render(<MedicaoCanteiroPro />);
