const { useState, useEffect, useRef } = React;

// Injeção segura dos ícones Lucide no navegador
const Lucide = window.LucideReact || window.lucideReact || window.lucide || {};

// Função auxiliar para evitar undefined se algum ícone falhar
const getIcon = (name) => Lucide[name] || Lucide[name + 'Icon'] || (() => null);

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

    // Verificação 1: Igualdade exata
    if (t1 === t2) return 100;

    // Verificação 2: Uma contém a outra
    if (t1.includes(t2) || t2.includes(t1)) return 85;

    // Verificação 3: Palavras em comum
    const palavras1 = t1.split(/\s+/);
    const palavras2 = t2.split(/\s+/);
    const palavrasComuns = palavras1.filter(p => palavras2.includes(p)).length;
    if (palavrasComuns > 0) return 70 + (palavrasComuns * 10);

    return 0;
  };

  // Verificar categorias similares enquanto digita
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

  // Edição de meta
  const [editandoMeta, setEditandoMeta] = useState(null);
  const [novaMetaValor, setNovaMetaValor] = useState('');

  // Câmera
  const [cameraAberta, setCameraAberta] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const [telaAtiva, setTelaAtiva] = useState('obras');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [permissaoCameraModal, setPermissaoCameraModal] = useState(false);
  const [permissaoCameraStatus, setPermissaoCameraStatus] = useState('nao-verificada');
  const [tipoGrafico, setTipoGrafico] = useState('barras'); // 'barras', 'treemap', 'tabela'

  // Dados para novo serviço
  const [servicoForm, setServicoForm] = useState({
    nome: '',
    categoria: 'Estrutura',
    metaTipo: 'area',
    metaValor: '',
    unidade: 'm²'
  });

  // Dados para nova medição parcial
  const [medicaoForm, setMedicaoForm] = useState({
    servicoId: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    funcionarios: '',
    observacao: '',
    fotos: [],
    justificativaExtrapolacao: ''
  });

  // Cores para empreiteiros
  const cores = ['#d97757', '#c9a36b', '#7b68a6', '#4a90a4', '#6b9b6e', '#a86d4f'];

  // Cores fixas por categoria (semânticas quando possível: ex. PPCI em vermelho = alerta de segurança/incêndio)
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

  // Retorna cor consistente para qualquer categoria (fixa ou gerada por hash para categorias personalizadas)
  const getCorCategoria = (categoria) => {
    if (CORES_CATEGORIA[categoria]) return CORES_CATEGORIA[categoria];
    let hash = 0;
    for (let i = 0; i < categoria.length; i++) hash = categoria.charCodeAt(i) + ((hash << 5) - hash);
    return PALETA_FALLBACK[Math.abs(hash) % PALETA_FALLBACK.length];
  };

  // Retorna cor + rótulo semântico de acordo com o progresso (mesma lógica em todo o app)
  const getStatusProgresso = (percentual) => {
    if (percentual >= 100) return { cor: '#22c55e', label: 'Completo', emoji: '🟢' };
    if (percentual >= 70) return { cor: '#3b82f6', label: 'Avançado', emoji: '🔵' };
    if (percentual >= 40) return { cor: '#f59e0b', label: 'Em andamento', emoji: '🟡' };
    if (percentual > 0) return { cor: '#ef4444', label: 'Iniciando', emoji: '🔴' };
    return { cor: '#9ca3af', label: 'Não iniciado', emoji: '⚪' };
  };

  // Carregar dados
  useEffect(() => {
    const saved = localStorage.getItem('medicaoCanteiroPro_v5');
    if (saved) {
      const data = JSON.parse(saved);
      setObras(data.obras || []);
      setCategorias(data.categorias || [
        'Estrutura', 'Fundação', 'Alvenaria', 'Cobertura', 'Hidrossanitário',
        'Elétrica', 'Gesso/Drywall', 'Esquadrias', 'Revestimentos', 'Pintura',
        'Pavimentação', 'Urbanização', 'PPCI', 'Limpeza Final'
      ]);
    }
    
    // Obter localização
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

    // Solicitar permissão de câmera uma única vez no carregamento
    solicitarPermissaoCameraUnicaVez();
  }, []);

  // Solicitar permissão de câmera UMA ÚNICA VEZ
  const solicitarPermissaoCameraUnicaVez = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissaoCameraStatus('nao-disponivel');
        return;
      }

      // Tentar acessar câmera para solicitar permissão
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      // Se conseguiu, permissão foi concedida
      setPermissaoCameraStatus('concedida');
      
      // Parar a stream imediatamente (só quer a permissão)
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissaoCameraStatus('negada');
      } else if (err.name === 'NotFoundError') {
        setPermissaoCameraStatus('nao-disponivel');
      } else {
        // Para outros erros, tentar novamente depois
        setPermissaoCameraStatus('nao-verificada');
      }
    }
  };

  // Salvar dados
  const salvarDados = (novasObras) => {
    localStorage.setItem('medicaoCanteiroPro_v5', JSON.stringify({
      obras: novasObras,
      categorias
    }));
  };

  // Adicionar categoria
  const adicionarCategoria = () => {
    if (!novaCategoria.trim()) return;
    
    // Apenas avisar sobre duplicata exata
    const normalizadaNova = novaCategoria.toLowerCase().trim();
    const jaExiste = categorias.some(cat => cat.toLowerCase().trim() === normalizadaNova);
    
    if (jaExiste) {
      alert('❌ Esta categoria já existe com este nome!');
      return;
    }

    const newCategorias = [...categorias, novaCategoria];
    setCategorias(newCategorias);
    setCategoriaRecemCriada(novaCategoria);
    setServicoForm({ ...servicoForm, categoria: novaCategoria });
    setNovaCategoria('');
    setCategoriaSimilar(null);
    
    localStorage.setItem('medicaoCanteiroPro_v5', JSON.stringify({
      obras,
      categorias: newCategorias
    }));

    // Remover destaque após 3 segundos
    setTimeout(() => setCategoriaRecemCriada(null), 3000);
  };

  // Deletar categoria
  const deletarCategoria = (cat) => {
    const newCategorias = categorias.filter(c => c !== cat);
    setCategorias(newCategorias);
    localStorage.setItem('medicaoCanteiroPro_v5', JSON.stringify({
      obras,
      categorias: newCategorias
    }));
  };

  // Criar nova obra
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

  // Entrar em uma obra
  const entrarObra = (obraId) => {
    setObraAtiva(obraId);
    const obra = obras.find(o => o.id === obraId);
    if (obra) {
      setEmpreiteiros(obra.empreiteiros || []);
    }
  };

  // Voltar ao dashboard
  const voltarDashboard = () => {
    const obraAtualObj = obras.find(o => o.id === obraAtiva);
    if (obraAtualObj) {
      const novasObras = obras.map(o => {
        if (o.id === obraAtiva) {
          return { ...o, empreiteiros };
        }
        return o;
      });
      setObras(novasObras);
      salvarDados(novasObras);
    }
    setObraAtiva(null);
    setEmpreiteiros([]);
    setTelaAtiva('obras');
  };

  // Deletar obra
  const deletarObra = (obraId) => {
    if (confirm('Tem certeza que deseja deletar esta obra?')) {
      const novasObras = obras.filter(o => o.id !== obraId);
      setObras(novasObras);
      salvarDados(novasObras);
    }
  };

  // Adicionar empreiteiro
  const adicionarEmpreiteiro = () => {
    if (!novoEmpreiteiro.trim()) return;
    const newEmpreiteiro = {
      id: Date.now(),
      nome: novoEmpreiteiro,
      cor: cores[empreiteiros.length % cores.length],
      servicos: [],
      dataCriacao: new Date().toLocaleDateString('pt-BR')
    };
    const newEmpreiteiros = [...empreiteiros, newEmpreiteiro];
    setEmpreiteiros(newEmpreiteiros);
    setNovoEmpreiteiro('');
  };

  // Adicionar serviço
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

  // Editar meta (registra aditivo/histórico de alteração)
  const editarMetaServico = (empreiteiroId, servicoId, novoValor) => {
    if (!novoValor || isNaN(novoValor)) return;
    const novoValorNum = parseFloat(novoValor);

    const newEmpreiteiros = empreiteiros.map(e => {
      if (e.id === empreiteiroId) {
        return {
          ...e,
          servicos: e.servicos.map(s => {
            if (s.id === servicoId) {
              const metaOriginal = s.metaOriginal !== undefined ? s.metaOriginal : s.metaValor;
              const diferenca = novoValorNum - s.metaValor;

              // Só registra aditivo se o valor realmente mudou
              if (diferenca === 0) return s;

              const novoAditivo = {
                id: Date.now(),
                valorAnterior: s.metaValor,
                valorNovo: novoValorNum,
                diferenca: diferenca,
                data: new Date().toLocaleDateString('pt-BR'),
                hora: new Date().toLocaleTimeString('pt-BR')
              };

              return {
                ...s,
                metaValor: novoValorNum,
                metaOriginal: metaOriginal,
                aditivos: [...(s.aditivos || []), novoAditivo]
              };
            }
            return s;
          })
        };
      }
      return e;
    });

    setEmpreiteiros(newEmpreiteiros);
    setEditandoMeta(null);
    setNovaMetaValor('');
  };

  // Verificar permissão câmera
  const verificarPermissaoCamara = async () => {
    try {
      if (!navigator.permissions || !navigator.permissions.query) {
        return 'nao-verificada';
      }
      const permission = await navigator.permissions.query({ name: 'camera' });
      return permission.state;
    } catch (err) {
      return 'nao-verificada';
    }
  };

  // Solicitar permissão câmera
  const solicitarPermissaoCamara = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissaoCameraStatus('nao-disponivel');
        alert('Câmera não disponível neste dispositivo ou navegador');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      setPermissaoCameraStatus('concedida');
      setPermissaoCameraModal(false);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissaoCameraStatus('negada');
        alert('❌ Permissão de câmera negada!');
      }
      setPermissaoCameraStatus('negada');
    }
  };

  // Iniciar câmera
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
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
        setCameraAberta(servicoId);
      }
    } catch (err) {
      alert('❌ Erro ao acessar câmera: ' + err.message);
    }
  };

  // Capturar foto
  const capturarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      setFotoCapturada(canvasRef.current.toDataURL('image/jpeg'));
    }
  };

  // Adicionar foto
  const adicionarFotoMedicao = () => {
    if (fotoCapturada) {
      const agora = new Date();
      const novaFoto = {
        id: Date.now(),
        imagem: fotoCapturada,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR'),
        gps: localizacao
      };
      setMedicaoForm({
        ...medicaoForm,
        fotos: [...medicaoForm.fotos, novaFoto]
      });
      setFotoCapturada(null);
      fecharCamera();
    }
  };

  // Fechar câmera
  const fecharCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraAberta(null);
  };

  // Remover foto
  const removerFoto = (fotoId) => {
    setMedicaoForm({
      ...medicaoForm,
      fotos: medicaoForm.fotos.filter(f => f.id !== fotoId)
    });
  };

  // Verifica se um valor de medição extrapola a meta restante do serviço
  const verificarExtrapolacao = (servico, valorInformado) => {
    const medidoAtual = servico.medicoes.reduce((sum, m) => sum + m.valor, 0);
    const faltam = servico.metaValor - medidoAtual;
    const excedente = valorInformado - faltam;
    return {
      extrapola: excedente > 0,
      faltam: faltam,
      excedente: excedente
    };
  };

  // Adicionar medição
  const adicionarMedicaoParcial = (empreiteiroId, servicoId) => {
    if (!medicaoForm.valor) return false;

    const emp = empreiteiros.find(e => e.id === empreiteiroId);
    const servico = emp?.servicos.find(s => s.id === servicoId);
    if (!servico) return false;

    const valorInformado = parseFloat(medicaoForm.valor);
    const { extrapola, excedente } = verificarExtrapolacao(servico, valorInformado);

    // Bloqueia o salvamento se extrapolar e não houver justificativa
    if (extrapola && !medicaoForm.justificativaExtrapolacao.trim()) {
      alert(`⚠️ Esta medição extrapola a meta em ${excedente.toFixed(2)} ${servico.unidade}.\n\nÉ obrigatório justificar a extrapolação antes de salvar.`);
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

  // Deletar medição
  const deletarMedicao = (empreiteiroId, servicoId, medicaoId) => {
    const newEmpreiteiros = empreiteiros.map(e => {
      if (e.id === empreiteiroId) {
        return {
          ...e,
          servicos: e.servicos.map(s => {
            if (s.id === servicoId) {
              return {
                ...s,
                medicoes: s.medicoes.filter(m => m.id !== medicaoId)
              };
            }
            return s;
          })
        };
      }
      return e;
    });
    setEmpreiteiros(newEmpreiteiros);
  };

  // Deletar empreiteiro
  const deletarEmpreiteiro = (id) => {
    setEmpreiteiros(empreiteiros.filter(e => e.id !== id));
  };

  // Deletar serviço
  const deletarServico = (empreiteiroId, servicoId) => {
    const newEmpreiteiros = empreiteiros.map(e => {
      if (e.id === empreiteiroId) {
        return {
          ...e,
          servicos: e.servicos.filter(s => s.id !== servicoId)
        };
      }
      return e;
    });
    setEmpreiteiros(newEmpreiteiros);
  };

  // Calcular progresso
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

  // Obter medições por data
  const obterMedicoesData = (data) => {
    const medicoes = [];
    empreiteiros.forEach(emp => {
      emp.servicos.forEach(serv => {
        serv.medicoes.forEach(med => {
          if (med.data === data) {
            medicoes.push({
              ...med,
              empreiteiro: emp.nome,
              empreiteiroId: emp.id,
              empreiteiroCor: emp.cor,
              servico: serv.nome,
              servicoId: serv.id,
              categoria: serv.categoria,
              unidade: serv.unidade
            });
          }
        });
      });
    });
    return medicoes;
  };

  // Calcular resumo por categoria
  const calcularResumoPorCategoria = () => {
    const resumo = {};
    
    empreiteiros.forEach(emp => {
      emp.servicos.forEach(serv => {
        if (!resumo[serv.categoria]) {
          resumo[serv.categoria] = {
            totalMeta: 0,
            totalMedido: 0,
            quantidade: 0,
            unidade: serv.unidade,
            percentual: 0
          };
        }
        
        const medido = serv.medicoes.reduce((sum, m) => sum + m.valor, 0);
        resumo[serv.categoria].totalMeta += serv.metaValor;
        resumo[serv.categoria].totalMedido += medido;
        resumo[serv.categoria].quantidade += 1;
      });
    });

    // Calcular percentual
    Object.keys(resumo).forEach(cat => {
      resumo[cat].percentual = resumo[cat].totalMeta > 0 
        ? Math.round((resumo[cat].totalMedido / resumo[cat].totalMeta) * 100)
        : 0;
    });

    return resumo;
  };

  // Calcula progresso de uma obra a partir da sua própria lista de empreiteiros (não depende da obra ativa)
  const calcularProgressoObra = (listaEmpreiteiros) => {
    let totalMeta = 0;
    let totalMedido = 0;
    (listaEmpreiteiros || []).forEach(emp => {
      (emp.servicos || []).forEach(serv => {
        totalMeta += serv.metaValor;
        totalMedido += (serv.medicoes || []).reduce((sum, m) => sum + m.valor, 0);
      });
    });
    return totalMeta > 0 ? Math.round((totalMedido / totalMeta) * 100) : 0;
  };

  // Calcular progresso total
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

    const percentualTotal = totalMeta > 0 ? Math.round((totalMedido / totalMeta) * 100) : 0;

    return {
      totalMeta,
      totalMedido,
      percentualTotal,
      servicosCompletos,
      totalServicos
    };
  };

  // Calcular progresso por empreiteiro
  const calcularProgressoEmpreiteiro = (emp) => {
    let totalMeta = 0;
    let totalMedido = 0;
    let completos = 0;

    emp.servicos.forEach(serv => {
      totalMeta += serv.metaValor;
      const medido = serv.medicoes.reduce((sum, m) => sum + m.valor, 0);
      totalMedido += medido;
      if (medido >= serv.metaValor) completos++;
    });

    const percentual = totalMeta > 0 ? Math.round((totalMedido / totalMeta) * 100) : 0;

    return {
      percentual,
      completos,
      total: emp.servicos.length
    };
  };

  // Exportar relatório
  const exportarRelatorio = () => {
    const obraAtualObj = obras.find(o => o.id === obraAtiva);
    if (!obraAtualObj) return;

    let csv = 'RELATÓRIO DE MEDIÇÕES\n';
    csv += `Projeto: ${obraAtualObj.nome}\n`;
    csv += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    const progTotal = calcularProgressoTotal();
    csv += `PROGRESSO TOTAL DA OBRA: ${progTotal.percentualTotal}%\n\n`;

    // Coletar todas as extrapolações para o resumo no topo
    const extrapolacoes = [];
    empreiteiros.forEach(emp => {
      emp.servicos.forEach(serv => {
        serv.medicoes.forEach(med => {
          if (med.extrapolou) {
            extrapolacoes.push({
              empreiteiro: emp.nome,
              servico: serv.nome,
              categoria: serv.categoria,
              valor: med.valor,
              unidade: serv.unidade,
              data: med.data,
              justificativa: med.justificativaExtrapolacao || '(sem justificativa registrada)'
            });
          }
        });
      });
    });

    if (extrapolacoes.length > 0) {
      csv += `\n⚠️ ALERTAS DE EXTRAPOLAÇÃO (${extrapolacoes.length})\n`;
      csv += 'Empreiteiro,Serviço,Categoria,Valor Medido,Unidade,Data,Justificativa\n';
      extrapolacoes.forEach(ex => {
        csv += `"${ex.empreiteiro}","${ex.servico}","${ex.categoria}",${ex.valor},"${ex.unidade}","${ex.data}","${ex.justificativa.replace(/"/g, "'")}"\n`;
      });
      csv += '\n';
    }

    empreiteiros.forEach(emp => {
      const progEmp = calcularProgressoEmpreiteiro(emp);
      csv += `\n=== EMPREITEIRO: ${emp.nome} ===\n`;
      csv += `Progresso: ${progEmp.percentual}%\n`;
      csv += 'Serviço,Categoria,Meta,Unidade,Medido,Faltam,Progresso,Aditivo\n';

      emp.servicos.forEach(serv => {
        const prog = calcularProgresso(serv);
        const aditivoTotal = serv.metaOriginal !== undefined ? (serv.metaValor - serv.metaOriginal) : 0;
        const aditivoTexto = aditivoTotal !== 0 ? `${aditivoTotal > 0 ? '+' : ''}${aditivoTotal.toFixed(2)}` : '-';
        csv += `"${serv.nome}","${serv.categoria}",${serv.metaValor},"${serv.unidade}",${prog.medido},${prog.faltam},${prog.percentual}%,${aditivoTexto}\n`;
      });

      // Detalhe das medições individuais, incluindo marcação de extrapolação
      csv += '\nDetalhe das Medições:\n';
      csv += 'Serviço,Data,Quantidade,Funcionários,Produtividade,Extrapolou?,Justificativa,Fotos,Observação\n';
      emp.servicos.forEach(serv => {
        serv.medicoes.forEach(med => {
          const produtividade = med.funcionarios > 0 ? (med.valor / med.funcionarios).toFixed(2) : '-';
          csv += `"${serv.nome}","${med.data}",${med.valor},${med.funcionarios || 0},${produtividade},${med.extrapolou ? 'SIM' : 'Não'},"${(med.justificativaExtrapolacao || '').replace(/"/g, "'")}",${med.fotos ? med.fotos.length : 0},"${(med.observacao || '').replace(/"/g, "'")}"\n`;
        });
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${obraAtualObj.nome}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    link.click();
  };

  // ==================== DASHBOARD ====================
  if (!obraAtiva) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f1e8' }}>
        <div style={{ backgroundColor: '#2c2c2c' }} className="text-white sticky top-0 z-10">
          <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 size={28} /> Gestor de Obras
            </h1>
            <p className="text-sm opacity-80 mt-1">Acompanhe múltiplas obras simultaneamente</p>
          </div>

          {/* Abas */}
          <div className="border-t border-white border-opacity-20 flex gap-0" style={{ backgroundColor: '#1a1a1a' }}>
            <button
              onClick={() => setTelaAtiva('obras')}
              className={`flex-1 py-3 text-center font-medium transition ${
                telaAtiva === 'obras' ? 'border-b-2 opacity-100' : 'opacity-60 hover:opacity-80'
              }`}
              style={{ borderBottomColor: telaAtiva === 'obras' ? '#d97757' : 'transparent' }}
            >
              🏗️ Obras
            </button>
            <button
              onClick={() => setTelaAtiva('categorias')}
              className={`flex-1 py-3 text-center font-medium transition ${
                telaAtiva === 'categorias' ? 'border-b-2 opacity-100' : 'opacity-60 hover:opacity-80'
              }`}
              style={{ borderBottomColor: telaAtiva === 'categorias' ? '#d97757' : 'transparent' }}
            >
              📂 Categorias
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 pb-20">
          {/* TELA: CATEGORIAS */}
          {telaAtiva === 'categorias' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandido(expandido === 'cat' ? null : 'cat')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={20} style={{ color: '#d97757' }} />
                    <span className="font-bold text-gray-800">Adicionar Categoria Personalizada</span>
                  </div>
                  <span className="text-gray-400">{expandido === 'cat' ? '−' : '+'}</span>
                </button>

                {expandido === 'cat' && (
                  <div className="border-t p-4 bg-gray-50 space-y-3">
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-2">
                        Nome da Categoria
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Pintura, Elétrica, Estrutura..."
                        value={novaCategoria}
                        onChange={(e) => verificarCategoriaSimilar(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && adicionarCategoria()}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" style={{ focusRingColor: '#d97757' }}
                      />
                    </div>

                    {/* Avisos de similaridade */}
                    {categoriaSimilar && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                        <div className="text-sm text-yellow-800">
                          <strong>⚠️ Categoria Similar Detectada!</strong>
                        </div>
                        <div className="text-sm text-yellow-700 mt-1">
                          Já existe: <strong>"{categoriaSimilar.categoria}"</strong>
                        </div>
                        {categoriaSimilar.similaridade === 100 && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Esta categoria é idêntica. Você tem certeza que quer criar outra?
                          </div>
                        )}
                        {categoriaSimilar.similaridade >= 85 && categoriaSimilar.similaridade < 100 && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Esta categoria é muito similar. Considere usar a existente ou renomear.
                          </div>
                        )}
                        {categoriaSimilar.similaridade < 85 && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Esta categoria é parecida. Verifique se é realmente necessária.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lista de categorias existentes */}
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs font-bold text-gray-600 mb-2">
                        📂 Categorias Já Criadas ({categorias.length}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categorias.length === 0 ? (
                          <span className="text-xs text-gray-500">Nenhuma categoria criada ainda</span>
                        ) : (
                          categorias.map(cat => (
                            <span
                              key={cat}
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: cat === categoriaRecemCriada ? '#22c55e' : '#f3f4f6',
                                color: cat === categoriaRecemCriada ? 'white' : '#4b5563',
                                border: cat === categoriaSimilar?.categoria ? '2px solid #eab308' : 'none'
                              }}
                            >
                              {cat} {cat === categoriaRecemCriada && '✨'}
                              {cat === categoriaSimilar?.categoria && ' ⚠️'}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2">
                      <button
                        onClick={adicionarCategoria}
                        className="flex-1 py-2 rounded-lg text-white font-medium hover:opacity-90 transition" style={{ backgroundColor: '#d97757' }}
                      >
                        ✓ Criar Categoria
                      </button>
                      <button
                        onClick={() => {
                          setNovaCategoria('');
                          setCategoriaSimilar(null);
                          setExpandido(null);
                        }}
                        className="flex-1 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition border"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {categorias.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b font-bold text-gray-800">
                    {categorias.length} Categoria{categorias.length !== 1 ? 's' : ''} Criada{categorias.length !== 1 ? 's' : ''}
                    <span className="text-xs text-gray-600 ml-2">• Clique em "Adicionar Categoria" para criar mais</span>
                  </div>
                  <div className="divide-y">
                    {categorias.map(cat => (
                      <div 
                        key={cat} 
                        className={`p-4 flex justify-between items-center transition ${
                          cat === categoriaRecemCriada 
                            ? 'bg-green-50 border-l-4 border-green-500' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <span className="font-bold text-gray-800">
                            📂 {cat}
                            {cat === categoriaRecemCriada && (
                              <span className="ml-2 text-green-600 font-bold animate-pulse">✨ NEW</span>
                            )}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            ✓ Disponível para todos os serviços
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja deletar "${cat}"?\n\nEsta ação não afetará os serviços já criados com esta categoria.`)) {
                              deletarCategoria(cat);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 font-bold ml-4"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TELA: OBRAS */}
          {telaAtiva === 'obras' && (
            <>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <button
                  onClick={() => setExpandido(expandido === 'nova' ? null : 'nova')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={20} style={{ color: '#d97757' }} />
                    <span className="font-bold text-gray-800">Criar Nova Obra</span>
                  </div>
                  <span className="text-gray-400">{expandido === 'nova' ? '−' : '+'}</span>
                </button>

                {expandido === 'nova' && (
                  <div className="border-t p-4 bg-gray-50 flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da obra"
                      value={novoNomeObra}
                      onChange={(e) => setNovoNomeObra(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && criarObra()}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" style={{ focusRingColor: '#d97757' }}
                    />
                    <button
                      onClick={criarObra}
                      className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition" style={{ backgroundColor: '#d97757' }}
                    >
                      Criar
                    </button>
                  </div>
                )}
              </div>

              {obras.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center shadow-sm">
                  <div className="text-4xl mb-3">🏗️</div>
                  <h3 className="font-bold text-gray-800 mb-2">Nenhuma obra criada</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {obras.map(obra => {
                    const avgPercent = calcularProgressoObra(obra.empreiteiros);
                    const status = getStatusProgresso(avgPercent);

                    return (
                      <div key={obra.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition border-t-4" style={{ borderColor: status.cor }}>
                        <button
                          onClick={() => entrarObra(obra.id)}
                          className="w-full p-4 text-left hover:bg-gray-50 transition"
                        >
                          <h3 className="font-bold text-lg text-gray-800 mb-1">{obra.nome}</h3>
                          <p className="text-xs text-gray-500">Criada em {obra.dataCriacao}</p>
                        </button>

                        <div className="px-4 pb-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                              {status.emoji} {status.label}
                            </span>
                            <span className="text-lg font-bold" style={{ color: status.cor }}>{avgPercent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full transition-all duration-300"
                              style={{ width: `${avgPercent}%`, backgroundColor: status.cor }}
                            />
                          </div>
                        </div>

                        <div className="border-t p-3 flex gap-2 bg-gray-50">
                          <button
                            onClick={() => entrarObra(obra.id)}
                            className="flex-1 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ backgroundColor: '#d97757' }}
                          >
                            Entrar
                          </button>
                          <button
                            onClick={() => deletarObra(obra.id)}
                            className="px-3 py-2 rounded-lg text-red-600 text-sm font-medium hover:bg-red-50 transition border border-red-200"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ==================== DENTRO DE UMA OBRA ====================
  const obraAtualObj = obras.find(o => o.id === obraAtiva);
  const progTotal = calcularProgressoTotal();
  const resumoPorCategoria = calcularResumoPorCategoria();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f1e8' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#2c2c2c' }} className="text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-bold mb-1">📏 {obraAtualObj.nome}</h1>
              <p className="text-sm opacity-80">{empreiteiros.length} empreiteiro{empreiteiros.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTelaAtiva('dashboard')}
                className="text-sm px-3 py-1 rounded opacity-80 hover:opacity-100 transition flex items-center gap-1"
              >
                📊 Dashboard
              </button>
              <button
                onClick={voltarDashboard}
                className="text-sm px-3 py-1 rounded opacity-80 hover:opacity-100 transition flex items-center gap-1"
              >
                <Home size={16} /> Voltar
              </button>
            </div>
          </div>

          {progTotal.totalServicos > 0 && (
            <div className="bg-black bg-opacity-30 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold flex items-center gap-1">
                  {getStatusProgresso(progTotal.percentualTotal).emoji} Progresso Total
                </span>
                <span className="text-lg font-bold" style={{ color: getStatusProgresso(progTotal.percentualTotal).cor }}>
                  {progTotal.percentualTotal}%
                </span>
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${progTotal.percentualTotal}%`, backgroundColor: getStatusProgresso(progTotal.percentualTotal).cor }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* DASHBOARD ANALÍTICO */}
        {telaAtiva === 'dashboard' && (
          <div className="space-y-4">
            {/* Seletor de gráficos */}
            <div className="bg-white rounded-lg shadow-sm p-4 flex gap-2 flex-wrap">
              <button
                onClick={() => setTipoGrafico('barras')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  tipoGrafico === 'barras'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{ backgroundColor: tipoGrafico === 'barras' ? '#d97757' : 'transparent' }}
              >
                📊 Barras
              </button>
              <button
                onClick={() => setTipoGrafico('treemap')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  tipoGrafico === 'treemap'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{ backgroundColor: tipoGrafico === 'treemap' ? '#d97757' : 'transparent' }}
              >
                🔲 Treemap
              </button>
              <button
                onClick={() => setTipoGrafico('tabela')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  tipoGrafico === 'tabela'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{ backgroundColor: tipoGrafico === 'tabela' ? '#d97757' : 'transparent' }}
              >
                📋 Tabela
              </button>
            </div>

            {/* Gráfico de Barras */}
            {tipoGrafico === 'barras' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4">Progresso por Categoria</h3>
                <div className="space-y-3">
                  {Object.entries(resumoPorCategoria).map(([categoria, dados]) => {
                    const status = getStatusProgresso(dados.percentual);
                    return (
                      <div key={categoria}>
                        <div className="flex justify-between items-center mb-1">
                          <span
                            className="font-bold text-white text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: getCorCategoria(categoria) }}
                          >
                            {categoria}
                          </span>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            {status.emoji} {dados.totalMedido.toFixed(1)} / {dados.totalMeta.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden flex items-center">
                          <div
                            className="h-full transition-all duration-300 flex items-center justify-end pr-2"
                            style={{
                              width: `${dados.percentual}%`,
                              backgroundColor: status.cor
                            }}
                          >
                            {dados.percentual > 10 && (
                              <span className="text-xs font-bold text-white">{dados.percentual}%</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {status.label} • {dados.quantidade} serviço{dados.quantidade !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legenda de status */}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs text-gray-500">
                  {['Não iniciado', 'Iniciando', 'Em andamento', 'Avançado', 'Completo'].map(label => {
                    const s = getStatusProgresso(
                      label === 'Não iniciado' ? 0 : label === 'Iniciando' ? 1 : label === 'Em andamento' ? 40 : label === 'Avançado' ? 70 : 100
                    );
                    return (
                      <span key={label} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.cor }} /> {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Treemap (Simulado com Grid) */}
            {tipoGrafico === 'treemap' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4">Visualização por Categoria</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(resumoPorCategoria).map(([categoria, dados]) => {
                    const corCat = getCorCategoria(categoria);
                    const status = getStatusProgresso(dados.percentual);
                    return (
                      <div
                        key={categoria}
                        className="p-4 rounded-lg text-white flex flex-col justify-center items-center text-center transition hover:shadow-lg relative"
                        style={{
                          backgroundColor: corCat,
                          minHeight: '120px',
                          border: dados.percentual === 100 ? '3px solid #22c55e' : 'none'
                        }}
                      >
                        <div className="absolute top-2 right-2 text-sm">{status.emoji}</div>
                        <div className="text-2xl font-bold">{dados.percentual}%</div>
                        <div className="font-bold text-sm">{categoria}</div>
                        <div className="text-xs opacity-90">
                          {dados.totalMedido.toFixed(0)} de {dados.totalMeta.toFixed(0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabela */}
            {tipoGrafico === 'tabela' && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead style={{ backgroundColor: '#f5f1e8' }}>
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-800">Categoria</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-800">Meta</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-800">Medido</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-800">Progresso</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-800">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resumoPorCategoria).map(([categoria, dados], idx) => {
                      const status = getStatusProgresso(dados.percentual);
                      return (
                        <tr key={categoria} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-4 py-3">
                            <span
                              className="font-bold text-white text-xs px-2 py-1 rounded-full"
                              style={{ backgroundColor: getCorCategoria(categoria) }}
                            >
                              {categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{dados.totalMeta.toFixed(1)}</td>
                          <td className="px-4 py-3 text-gray-600">{dados.totalMedido.toFixed(1)}</td>
                          <td className="px-4 py-3">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${dados.percentual}%`,
                                  backgroundColor: status.cor
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-sm" style={{ color: status.cor }}>
                            {status.emoji} {dados.percentual}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Estatísticas gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm border-t-4" style={{ borderColor: '#d97757' }}>
                <div className="text-2xl font-bold text-gray-800">{progTotal.totalServicos}</div>
                <div className="text-xs text-gray-600">Total de Serviços</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-t-4" style={{ borderColor: '#c9a36b' }}>
                <div className="text-2xl font-bold text-gray-800">{progTotal.servicosCompletos}</div>
                <div className="text-xs text-gray-600">Completos</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-t-4" style={{ borderColor: '#22c55e' }}>
                <div className="text-2xl font-bold text-gray-800">{progTotal.percentualTotal}%</div>
                <div className="text-xs text-gray-600">Progresso Geral</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-t-4" style={{ borderColor: '#7b68a6' }}>
                <div className="text-2xl font-bold text-gray-800">{Object.keys(resumoPorCategoria).length}</div>
                <div className="text-xs text-gray-600">Categorias</div>
              </div>
            </div>
          </div>
        )}

        {/* TELA DE MEDIÇÕES (como antes) */}
        {telaAtiva !== 'dashboard' && (
          <>
            {/* Permissão câmera */}
            {permissaoCameraStatus !== 'concedida' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6" style={{ borderColor: '#4a90a4' }}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📸</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">Ativar Câmera para Fotos</h4>
                    <p className="text-sm text-gray-600 mt-1">Tire fotos com GPS automático dos serviços realizados</p>
                  </div>
                  <button
                    onClick={() => {
                      setPermissaoCameraModal(true);
                      solicitarPermissaoCamara();
                    }}
                    className="px-3 py-2 rounded-lg text-white text-sm font-medium whitespace-nowrap" style={{ backgroundColor: '#4a90a4' }}
                  >
                    Ativar Câmera
                  </button>
                </div>
              </div>
            )}

            {/* Adicionar empreiteiro */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <button
                onClick={() => setExpandido(expandido === 'empreiteiro' ? null : 'empreiteiro')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2">
                  <Users size={20} style={{ color: '#d97757' }} />
                  <span className="font-bold text-gray-800">Adicionar Empreiteiro</span>
                </div>
                <span className="text-gray-400">{expandido === 'empreiteiro' ? '−' : '+'}</span>
              </button>
              {expandido === 'empreiteiro' && (
                <div className="border-t p-4 bg-gray-50 flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome do empreiteiro/grupo"
                    value={novoEmpreiteiro}
                    onChange={(e) => setNovoEmpreiteiro(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && adicionarEmpreiteiro()}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" style={{ focusRingColor: '#d97757' }}
                  />
                  <button
                    onClick={adicionarEmpreiteiro}
                    className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition" style={{ backgroundColor: '#d97757' }}
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* Lista de Empreiteiros */}
            {empreiteiros.map(emp => {
              const progEmp = calcularProgressoEmpreiteiro(emp);
              const statusEmp = getStatusProgresso(progEmp.percentual);

              return (
                <div key={emp.id} className="bg-white rounded-lg shadow-sm overflow-hidden mb-4 border-l-4" style={{ borderColor: emp.cor }}>
                  <button
                    onClick={() => setExpandido(expandido === emp.id ? null : emp.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: emp.cor }} />
                      <div className="text-left">
                        <div className="font-bold text-gray-800">{emp.nome}</div>
                        <div className="text-sm flex items-center gap-1" style={{ color: statusEmp.cor }}>
                          {statusEmp.emoji} {progEmp.percentual}% <span className="text-gray-500">• {progEmp.completos}/{progEmp.total} serviços</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400">{expandido === emp.id ? '−' : '+'}</div>
                  </button>

                  {expandido === emp.id && (
                    <div className="border-t">
                      {progEmp.total > 0 && (
                        <div className="p-4 bg-gray-50 border-b">
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${progEmp.percentual}%`,
                                backgroundColor: statusEmp.cor
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Adicionar novo serviço */}
                      <button
                        onClick={() => setEmpreiteiroEditando(empreiteiroEditando === emp.id ? null : emp.id)}
                        className="w-full p-4 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 transition border-b"
                      >
                        <Plus size={16} /> Novo Serviço
                      </button>

                      {empreiteiroEditando === emp.id && (
                        <div className="p-4 bg-blue-50 border-b space-y-3">
                          {categoriaRecemCriada && (
                            <div className="bg-green-100 border-l-4 border-green-500 p-2 rounded text-xs text-green-700 font-bold animate-pulse">
                              ✨ Categoria "{categoriaRecemCriada}" criada! Selecione abaixo →
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="Nome do serviço"
                            value={servicoForm.nome}
                            onChange={(e) => setServicoForm({ ...servicoForm, nome: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" style={{ focusRingColor: emp.cor }}
                          />
                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-2">
                              📂 Selecione uma Categoria:
                            </label>
                            <select
                              value={servicoForm.categoria}
                              onChange={(e) => setServicoForm({ ...servicoForm, categoria: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" style={{ 
                                focusRingColor: emp.cor,
                                borderColor: servicoForm.categoria === categoriaRecemCriada ? emp.cor : 'inherit',
                                borderWidth: servicoForm.categoria === categoriaRecemCriada ? '2px' : '1px'
                              }}
                            >
                              <option value="" disabled>-- Escolha uma categoria --</option>
                              {categorias.map(cat => (
                                <option key={cat} value={cat}>
                                  {cat} {cat === categoriaRecemCriada ? '✨ NEW' : ''}
                                </option>
                              ))}
                            </select>
                            {servicoForm.categoria === categoriaRecemCriada && (
                              <div className="text-xs text-green-600 font-bold mt-1">
                                ✓ Categoria recém criada!
                              </div>
                            )}
                            {categorias.length === 0 && (
                              <div className="text-xs text-orange-600 font-bold mt-1">
                                ⚠️ Crie uma categoria em "📂 Categorias" primeiro
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={servicoForm.metaTipo}
                              onChange={(e) => {
                                const tipo = e.target.value;
                                const unidades = { 'area': 'm²', 'volume': 'm³', 'linear': 'm', 'contagem': 'unid.' };
                                setServicoForm({ ...servicoForm, metaTipo: tipo, unidade: unidades[tipo] });
                              }}
                              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" style={{ focusRingColor: emp.cor }}
                            >
                              <option value="area">Área (m²)</option>
                              <option value="volume">Volume (m³)</option>
                              <option value="linear">Linear (m)</option>
                              <option value="contagem">Contagem</option>
                            </select>
                            <input
                              type="number"
                              placeholder="Meta total"
                              value={servicoForm.metaValor}
                              onChange={(e) => setServicoForm({ ...servicoForm, metaValor: e.target.value })}
                              step="0.1"
                              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2" style={{ focusRingColor: emp.cor }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              adicionarServico(emp.id);
                              setEmpreiteiroEditando(null);
                            }}
                            className="w-full py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ backgroundColor: emp.cor }}
                          >
                            Salvar Serviço
                          </button>
                        </div>
                      )}

                      {/* Lista de Serviços */}
                      {emp.servicos.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Nenhum serviço</div>
                      ) : (
                        emp.servicos.map(serv => {
                          const prog = calcularProgresso(serv);
                          const temAditivo = serv.aditivos && serv.aditivos.length > 0;
                          const ultimoAditivo = temAditivo ? serv.aditivos[serv.aditivos.length - 1] : null;
                          const corCategoria = getCorCategoria(serv.categoria);
                          const status = getStatusProgresso(prog.percentual);
                          return (
                            <div key={serv.id} className="p-4 border-b hover:bg-gray-50 transition">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-bold text-gray-800">{serv.nome}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mt-1">
                                    <span
                                      className="px-2 py-0.5 rounded-full font-bold text-white"
                                      style={{ backgroundColor: corCategoria }}
                                    >
                                      {serv.categoria}
                                    </span>
                                    <span>•</span>
                                    {editandoMeta === serv.id ? (
                                      <span className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          autoFocus
                                          defaultValue={serv.metaValor}
                                          step="0.1"
                                          onChange={(e) => setNovaMetaValor(e.target.value)}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') editarMetaServico(emp.id, serv.id, novaMetaValor);
                                          }}
                                          className="w-20 px-1 py-0.5 border rounded text-xs"
                                        />
                                        <button
                                          onClick={() => editarMetaServico(emp.id, serv.id, novaMetaValor)}
                                          className="text-green-600 font-bold"
                                        >
                                          <Save size={12} />
                                        </button>
                                        <button
                                          onClick={() => { setEditandoMeta(null); setNovaMetaValor(''); }}
                                          className="text-gray-400 font-bold"
                                        >
                                          <X size={12} />
                                        </button>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        Meta: {serv.metaValor} {serv.unidade}
                                        <button
                                          onClick={() => { setEditandoMeta(serv.id); setNovaMetaValor(serv.metaValor); }}
                                          className="text-gray-400 hover:text-gray-700"
                                        >
                                          <Edit2 size={11} />
                                        </button>
                                      </span>
                                    )}
                                  </div>

                                  {/* Indicador de Aditivo */}
                                  {temAditivo && (
                                    <div className="mt-1">
                                      <button
                                        onClick={() => setExpandido(expandido === `aditivo-${serv.id}` ? null : `aditivo-${serv.id}`)}
                                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                          ultimoAditivo.diferenca > 0
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        📈 Aditivo: {ultimoAditivo.diferenca > 0 ? '+' : ''}{ultimoAditivo.diferenca.toFixed(2)} {serv.unidade}
                                      </button>
                                      <span className="text-xs text-gray-400 ml-1">
                                        (meta original: {serv.metaOriginal} {serv.unidade})
                                      </span>

                                      {expandido === `aditivo-${serv.id}` && (
                                        <div className="mt-2 bg-gray-50 rounded-lg p-2 border text-xs space-y-1">
                                          <div className="font-bold text-gray-600 mb-1">Histórico de Aditivos:</div>
                                          {serv.aditivos.map(ad => (
                                            <div key={ad.id} className="flex justify-between text-gray-600">
                                              <span>{ad.valorAnterior} → {ad.valorNovo} {serv.unidade}</span>
                                              <span className={ad.diferenca > 0 ? 'text-blue-600 font-bold' : 'text-red-600 font-bold'}>
                                                {ad.diferenca > 0 ? '+' : ''}{ad.diferenca.toFixed(2)} • {ad.data}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold" style={{ color: emp.cor }}>
                                    {prog.medido} {serv.unidade}
                                  </div>
                                  <div className="text-sm font-bold flex items-center gap-1 justify-end" style={{ color: status.cor }}>
                                    {status.emoji} {prog.percentual}%
                                  </div>
                                  <div className="text-xs text-gray-400">{status.label}</div>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full transition-all duration-300"
                                    style={{
                                      width: `${prog.percentual}%`,
                                      backgroundColor: status.cor
                                    }}
                                  />
                                </div>
                              </div>

                              <button
                                onClick={() => setMedicaoAberta(medicaoAberta === serv.id ? null : serv.id)}
                                className="w-full mb-2 py-2 px-3 rounded-lg text-sm font-medium transition" style={{
                                  backgroundColor: emp.cor + '20',
                                  color: emp.cor,
                                  border: `1px solid ${emp.cor}`
                                }}
                              >
                                + Registrar Medição
                              </button>

                              {medicaoAberta === serv.id && (() => {
                                const valorAtual = parseFloat(medicaoForm.valor) || 0;
                                const extrapolacao = medicaoForm.valor ? verificarExtrapolacao(serv, valorAtual) : { extrapola: false, excedente: 0 };
                                return (
                                <div className="mb-3 p-3 rounded-lg bg-gray-50 space-y-2">
                                  <input
                                    type="number"
                                    placeholder={`Quantidade (${serv.unidade})`}
                                    value={medicaoForm.valor}
                                    onChange={(e) => setMedicaoForm({ ...medicaoForm, valor: e.target.value })}
                                    step="0.1"
                                    className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2" style={{
                                      focusRingColor: emp.cor,
                                      borderColor: extrapolacao.extrapola ? '#ef4444' : 'inherit',
                                      borderWidth: extrapolacao.extrapola ? '2px' : '1px'
                                    }}
                                  />

                                  {/* Alerta de extrapolação */}
                                  {extrapolacao.extrapola && (
                                    <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3 animate-pulse">
                                      <div className="flex items-start gap-2">
                                        <div className="text-xl">🚨</div>
                                        <div className="flex-1">
                                          <div className="font-bold text-red-700 text-sm">
                                            Medição extrapola a meta!
                                          </div>
                                          <div className="text-xs text-red-600 mt-1">
                                            Excedente de <strong>{extrapolacao.excedente.toFixed(2)} {serv.unidade}</strong> além do previsto. Justifique abaixo para poder salvar.
                                          </div>
                                        </div>
                                      </div>
                                      <textarea
                                        placeholder="Justifique a extrapolação (obrigatório)..."
                                        value={medicaoForm.justificativaExtrapolacao}
                                        onChange={(e) => setMedicaoForm({ ...medicaoForm, justificativaExtrapolacao: e.target.value })}
                                        className="w-full px-3 py-2 border-2 border-red-300 rounded text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                                        rows="2"
                                      />
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="date"
                                      value={medicaoForm.data}
                                      onChange={(e) => setMedicaoForm({ ...medicaoForm, data: e.target.value })}
                                      className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2" style={{ focusRingColor: emp.cor }}
                                    />
                                    <input
                                      type="number"
                                      placeholder="Nº funcionários"
                                      value={medicaoForm.funcionarios}
                                      onChange={(e) => setMedicaoForm({ ...medicaoForm, funcionarios: e.target.value })}
                                      className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2" style={{ focusRingColor: emp.cor }}
                                      min="0"
                                    />
                                  </div>
                                  <textarea
                                    placeholder="Observação"
                                    value={medicaoForm.observacao}
                                    onChange={(e) => setMedicaoForm({ ...medicaoForm, observacao: e.target.value })}
                                    className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 resize-none" style={{ focusRingColor: emp.cor }}
                                    rows="2"
                                  />

                                  <div className="border-t pt-2">
                                    {cameraAberta !== serv.id ? (
                                      <button
                                        onClick={() => {
                                          if (permissaoCameraStatus !== 'concedida') {
                                            setPermissaoCameraModal(true);
                                          } else {
                                            iniciarCamera(serv.id);
                                          }
                                        }}
                                        className="w-full py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2" style={{
                                          backgroundColor: emp.cor + '20',
                                          color: emp.cor,
                                          border: `1px solid ${emp.cor}`
                                        }}
                                      >
                                        <Camera size={16} /> {permissaoCameraStatus === 'concedida' ? 'Tirar Foto' : '🔒 Permitir'}
                                      </button>
                                    ) : (
                                      <div>
                                        <video
                                          ref={videoRef}
                                          autoPlay
                                          playsInline
                                          className="w-full rounded-lg mb-2 max-h-60"
                                          style={{ transform: 'scaleX(-1)' }}
                                        />
                                        <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />
                                        {!fotoCapturada ? (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={capturarFoto}
                                              className="flex-1 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: emp.cor }}
                                            >
                                              📸 Capturar
                                            </button>
                                            <button
                                              onClick={fecharCamera}
                                              className="flex-1 py-2 rounded-lg text-gray-600 text-sm font-medium border"
                                            >
                                              Fechar
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            <img src={fotoCapturada} alt="Foto" className="w-full rounded-lg max-h-60" />
                                            <div className="bg-blue-50 p-2 rounded text-xs">
                                              {localizacao && (
                                                <>
                                                  <div className="flex items-center gap-1 text-gray-700">
                                                    <MapPin size={14} /> GPS: {localizacao.latitude}, {localizacao.longitude}
                                                  </div>
                                                  <div className="text-gray-600 mt-1">
                                                    {new Date().toLocaleString('pt-BR')}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                            <div className="flex gap-2">
                                              <button
                                                onClick={adicionarFotoMedicao}
                                                className="flex-1 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: emp.cor }}
                                              >
                                                ✓ Adicionar
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setFotoCapturada(null);
                                                  fecharCamera();
                                                }}
                                                className="flex-1 py-2 rounded-lg text-gray-600 text-sm font-medium border"
                                              >
                                                Nova
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {medicaoForm.fotos.length > 0 && (
                                    <div>
                                      <div className="text-xs font-bold text-gray-600 mb-2">
                                        📸 {medicaoForm.fotos.length} foto{medicaoForm.fotos.length !== 1 ? 's' : ''}
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        {medicaoForm.fotos.map(foto => (
                                          <div key={foto.id} className="relative group">
                                            <img src={foto.imagem} alt="Foto" className="w-full h-20 rounded object-cover" />
                                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition rounded flex items-center justify-center">
                                              <button
                                                onClick={() => removerFoto(foto.id)}
                                                className="text-white p-2 hover:bg-red-600 rounded"
                                              >
                                                <Trash2 size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => {
                                      const sucesso = adicionarMedicaoParcial(emp.id, serv.id);
                                      if (sucesso) setMedicaoAberta(null);
                                    }}
                                    className="w-full py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ backgroundColor: emp.cor }}
                                  >
                                    Salvar Medição
                                  </button>
                                </div>
                                );
                              })()}

                              {serv.medicoes.length > 0 && (
                                <div className="mb-3 space-y-2">
                                  {serv.medicoes.map(med => (
                                    <div
                                      key={med.id}
                                      className={`flex justify-between items-start p-2 rounded text-sm ${
                                        med.extrapolou ? 'bg-red-50 border border-red-300' : 'bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-700 flex items-center gap-1">
                                          +{med.valor} {serv.unidade}
                                          {med.extrapolou && (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                              🚨 Extrapolou
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500">{med.data}</div>
                                        {med.extrapolou && med.justificativaExtrapolacao && (
                                          <div className="text-xs text-red-600 mt-1 italic">
                                            "{med.justificativaExtrapolacao}"
                                          </div>
                                        )}
                                        {med.fotos && med.fotos.length > 0 && (
                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded inline-block mt-1">
                                            📸 {med.fotos.length}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => deletarMedicao(emp.id, serv.id, med.id)}
                                        className="text-red-500 hover:text-red-700 font-bold ml-2"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <button
                                onClick={() => deletarServico(emp.id, serv.id)}
                                className="w-full py-1 text-xs text-gray-500 hover:text-red-600 font-medium transition"
                              >
                                Remover
                              </button>
                            </div>
                          );
                        })
                      )}

                      <button
                        onClick={() => deletarEmpreiteiro(emp.id)}
                        className="w-full p-3 text-sm font-medium transition" style={{ color: emp.cor }}
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {empreiteiros.length > 0 && empreiteiros.some(e => e.servicos.length > 0) && (
              <button
                onClick={exportarRelatorio}
                className="w-full py-3 rounded-lg text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2 mb-4" style={{ backgroundColor: '#c9a36b' }}
              >
                <Download size={20} /> Exportar Relatório
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal de permissão */}
      {permissaoCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm p-6 shadow-xl">
            <div className="text-4xl mb-4 text-center">📸</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Ativar Câmera</h3>
            <p className="text-gray-600 text-sm mb-4">
              Este aplicativo precisa acessar sua câmera para tirar fotos dos serviços.
            </p>
            <div className="space-y-2">
              <button
                onClick={solicitarPermissaoCamara}
                className="w-full py-3 rounded-lg text-white font-bold hover:opacity-90 transition" style={{ backgroundColor: '#d97757' }}
              >
                ✓ Permitir Câmera
              </button>
              <button
                onClick={() => setPermissaoCameraModal(false)}
                className="w-full py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition border"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Montagem da aplicação
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<MedicaoCanteiroPro />);
}
