# IGNISPYRO FirePotential 3D

Aplicação: https://dsantananet.github.io/ignispyro-firepotential-3d/ · Repositório: https://github.com/dsantananet/ignispyro-firepotential-3d

## Versão 0.2 — vento por hora, estações e integração

- Logótipo principal oficial fornecido pelo utilizador, com proporções preservadas. Identidade e marca IGNISPYRO mantêm os seus direitos.
- Fronteiras arredondadas por arcos partilhados (Chaikin, duas iterações); junções fixas. A geometria analítica original em grelha permanece separada. Uma curva que separa dois polígonos é calculada uma única vez e reutilizada pelos dois.
- Previsão horária ECMWF IFS 0,25° a 10 m via Open-Meteo, quatro dias, por localização. Interpolação das meias horas em u/v; nunca se interpolam graus diretamente nem se extrapola fora da cobertura. Origem, validade e consulta são exportadas; emissão/corrida do modelo não fornecidas pelo endpoint ficam nulas. Vento regional aplicado uniformemente ao domínio, sem correção WindNinja.
- Portugal: 227 estações do catálogo IPMA à data da implementação e a estação Aldeia/IALDEI10. A contagem pode mudar com o catálogo oficial. Observações horárias IPMA usam classes oficiais de direção; -99 é dado ausente. A Aldeia usa uma projeção pública dos dados já recolhidos pelo IGNISPYRO, sem exportar credenciais WU. Seleção e distância à origem visíveis. O modo observação exige hora compatível (até 30 minutos após a leitura), sem transformar observações em previsões. A altura do vento da Aldeia não está verificada e permanece nula. Dados antigos conservam as suas horas.
- MTG: imagem oficial FRP LSA SAF obtida do WMS e publicada como snapshot datado. O WMS não fornece CORS ao navegador; o GitHub Actions atualiza uma imagem sobre a Europa. Só é mostrada para análises entre a hora da imagem e 60 minutos depois; não se mostra uma imagem futura como se fosse passada. A resolução cartográfica de 1024×1024 sobre esta extensão é mais grosseira do que a resolução nativa do produto. O produto está em demonstração, frequência 10 min e latência publicada até 45 min; não é garantia de deteção ou vigilância operacional. Deteções pontuais importadas/snapshot têm hora, FRP e origem próprios; não são perímetros nem alimentam automaticamente o solver. A ausência de deteções não prova ausência de fogo.
- GitHub Actions verifica o código e publica `dist/` no Pages. A agenda consulta observações públicas aos minutos 7/17/27/37/47/57, sujeita à disponibilidade/atrasos do GitHub e dos fornecedores. O navegador atualiza catálogos/MTG a cada cinco minutos enquanto visível. A previsão é consultada por zona e guardada por 15 min.
- Se uma fonte falhar, mantém-se a identificação de dados ausentes/antigos. A imagem MTG é um snapshot datado do serviço oficial, atualizado pelo workflow; o ficheiro pontual `data/mtg.geojson` é um snapshot inicial, não um fluxo garantido. A imagem e os pontos têm relógios próprios.

### Contrato para o simulador

Abrir `/?lat=40.3211&lon=-7.6129&time=2026-10-24T14%3A00%3A00Z&radius=3`. Coordenadas WGS84; `time` ISO com fuso; raio 1–5 km. Só devem ser enviados os parâmetros que o utilizador pretende abrir no mapa; nunca tokens, utilizadores ou resultados privados em URLs públicas.

Exportação: GeoJSON `metadata.schema_version = firepotential/1.0`. `kind=potential_polygon` contém geometrias analíticas; `potential_polygon_display` contém os mesmos IDs com contornos arredondados. `adjacency` contém `from`/`to` e comprimento aproximado original; vento, direção aproximada e deteções MTG são feições separadas. As métricas analíticas não são recalculadas a partir do desenho arredondado. `solver_ready=false` permanece explícito. O método JavaScript `window.FirePotential3D.getScenario()` permite integração em contexto autorizado da mesma origem; não existe difusão por `postMessage` para origens arbitrárias.

O módulo do simulador valida o contrato e acrescenta uma abertura contextual do mapa; não substitui nem retreina o motor científico existente. A utilização operacional requer validação própria.

### Fontes e atribuições atuais

- IPMA API, dados horários e classes de rumo: https://api.ipma.pt/ . Catálogo/observações públicas; conservar identificação da fonte, hora e condições de utilização.
- ECMWF via Open-Meteo, documentação: https://open-meteo.com/en/docs . Dados de previsão distribuídos por Open-Meteo; consultar os termos aplicáveis ao uso comercial.
- EUMETSAT LSA SAF (2025): *MTG Fire Radiative Power - Pixel, V.1*, CC BY 4.0. Produto em demonstração: https://lsa-saf.eumetsat.int/en/data/products/fire-products/mtfrp/ . WMS oficial: https://adaguc.lsasvcs.ipma.pt/adaguc-server?DATASET=MTG-FRP&SERVICE=WMS&REQUEST=GetCapabilities . Transformação: seleção temporal e representação cartográfica; dados pontuais convertidos do arquivo IGNISPYRO existente para GeoJSON.

Verificações adicionais: `node test-topology.cjs`, `node test-weather.cjs`, `node test-data.cjs`. A descrição abaixo documenta a versão inicial e os limites científicos que permanecem aplicáveis; o modo inicial atual é previsão horária na data presente.

Protótipo experimental independente, centrado na Torre, Serra da Estrela. Não altera o simulador IGNISPYRO existente. Não é ferramenta validada para decisão operacional.

## Abrir

Com Node.js instalado, executar `node serve.cjs` nesta pasta e abrir http://127.0.0.1:4187. Também se pode servir a pasta `dist` com um servidor HTTP estático. Requer Internet para mapa base, bibliotecas e relevo; não requer chave/API paga. O servidor aceita apenas ligações locais. Parar com Ctrl+C.

## Utilização

1. Explorar o mapa com arrasto e zoom; usar Vista 2D/3D e a bússola. Origem inicial na Torre.
2. Escolher Marcar ponto ou Desenhar polígono; no segundo caso, clicar vértices, Desfazer vértice e Concluir desenho. O polígono representa o perímetro inicial. Centro da vista usa o centro do mapa como nova origem. Raio entre 1 e 5 km.
3. Definir vento de origem em graus e km/h. Setas escuras apontam para o destino do vento. Clicar nas setas para os valores. Este cenário uniforme não é uma execução WindNinja.
4. Escolher propagação de referência radial para o exterior ou um azimute definido pelo analista. Setas verdes mostram essa referência.
5. Escolher data e hora UTC. A orientação da vertente permanece fixa; posição do Sol, incidência e componente solar do CPS mudam com a hora. As alterações recalculam o cenário. No verão em Portugal continental, hora civil = UTC+1.
6. Alternar camada CPS, incidência solar, orientação ou declive. Consultar IDs para detalhes e lista de adjacentes. Exportar GeoJSON com origem, polígonos, ligações, setas e metadados.

## Ciência e limites

Referência conceptual: Castellnou et al. 2019, *Empowering strategic decision-making for wildfire management: avoiding the fear trap and creating a resilient landscape*, https://doi.org/10.1186/s42408-019-0048-6 . A segmentação automática e as regras binárias aqui implementadas são propostas exploratórias, não reprodução validada do método/artigo nem implementação oficial de Campbell.

Relevo real: Mapzen Terrain Tiles/AWS, mosaico global com fontes SRTM e outras. Atribuições: https://github.com/tilezen/joerd/blob/master/docs/attribution.md . Descodificação Terrarium `(R*256+G+B/256)-32768`, amostragem z12. Diferenças centrais a ±60 m para estimar declive e orientação; grelha de análise raio/10 (100–500 m). Células contíguas por quatro vizinhos, mesmo bitmask CPS e setor de orientação de 90°, são unidas em polígonos. São limites em grelha, não divisórias naturais refinadas. Só centros de células são filtrados por perímetro/raio; fronteiras podem ultrapassar esses limites até aproximadamente meia diagonal de célula. IDs renumerados em cada cenário por distância média à origem; não são identificadores persistentes entre cenários.

Avanço = direção para fora do ponto/perímetro mais próximo, ou azimute fixo definido pelo analista. Vento favorável se velocidade ≥0,5 m/s e direção de destino até 60° do avanço; declive favorável se ≥5° e subida até 60° do avanço; Sol favorável se acima do horizonte e incidência na normal da vertente ≥0,35. CPS 0/3 cinzento, 1/3 amarelo, 2/3 laranja, 3/3 vermelho. Estes limiares carecem de calibração; 3/3 não é probabilidade. Insolação direta instantânea geométrica não é aquecimento acumulado dos combustíveis. Sem sombras de montanhas, nuvens, estruturas de combustíveis, humidade, barreiras ou spotting.

Ligações são adjacências por borda de células, com comprimento comum aproximado exportado. Traço entre pontos representativos é esquemático e pode atravessar outras geometrias; não é corredor de propagação. Sem probabilidades, chegada ou eficácia de supressão.

Exagero do terreno 1,35 apenas visual. Não altera valores de elevação/declive. A classificação falha explicitamente se não houver relevo. Ponto/perímetro fora da cobertura/limites suportados pode falhar com mensagem.

## Campo WindNinja

Esta versão não executa WindNinja. Aceita um campo convertido para pontos GeoJSON WGS84, amostrado por vizinho mais próximo com distância máxima de 1 km. Exige `wind_source` (texto), `height_m` (número positivo), `valid_time` ISO com fuso, propriedades `u` (m/s para este) e `v` (m/s para norte). Os metadados são declarados pelo autor do ficheiro e não autenticados. A hora solar pode mudar mantendo o campo de vento fixo; a validade do campo permanece visível. Não misturar vento a alturas diferentes sem conversão física. Exportações ASC/SHP de WindNinja precisam de conversão antes desta importação. Modelo de formato em `wind-format.example.geojson`; é sintético e não cobre o domínio inicial.

## Verificações

`node test.cjs`: orientação física do vento, derivadas do relevo, posição solar no equinócio, inversão da direção de avanço, remoção do fator solar à noite e exposição este/oeste. `node --check dist/app.js`: sintaxe. Verificação visual e funcional no navegador local documentada na nota de entrega. Estes testes não constituem validação operacional.

## Próximos desenvolvimentos

Executar WindNinja real sobre um MDT local validado, integrar combustíveis/barreiras e sombras topográficas; validar regras CPS com analistas e documentação original; avaliar estabilidade espacial dos polígonos e distinguir adjacência de transição de propagação. Publicação hospedada não concluída: ferramenta Sites indisponível na sessão de criação.
