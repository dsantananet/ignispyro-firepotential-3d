# IGNISPYRO FirePotential 3D · 0.5

Aplicação autónoma para **alinhamentos de vento, declive e exposição solar potencial**, com relevo 3D, polígonos numerados e ligações geométricas. O simulador é um consumidor futuro separado. Não calcula vegetação, humidade, ROS, perímetros futuros ou probabilidade de arder.

- Portal protegido: https://100.83.124.1:8181/firepotential/ (rede NAS/Tailscale, conta IGNISPYRO autorizada).
- Entrada própria na Platform: https://100.83.124.1:8181/area/platform . Cartão independente do simulador.
- Visualização pública: https://dsantananet.github.io/ignispyro-firepotential-3d/ . O cálculo WindNinja na cloud exige a entrada protegida do portal.
- Estudo e limites CPS: [docs/CPS-method.md](docs/CPS-method.md).
- Ensaios de execução/geometria: [docs/validation-2026-10-24.json](docs/validation-2026-10-24.json). Não são validação operacional em incêndios observados.

## Utilização

1. O mapa abre centrado em Portugal. A origem é um ponto (exemplo inicial Torre), coordenadas WGS84 ou um polígono/perímetro desenhado; o centro da vista não altera a origem.
2. Escolher a zona e data/hora UTC. Todas as posições solares são calculadas para a latitude/longitude reais; não há regra fixa de vertente sul para todo o planeta.
3. No portal, selecionar WindNinja e1–6 horas e gerar os polígonos. Alterar parâmetros não lança automaticamente outro cálculo. Nunca incluir credenciais em URLs.
4. O sentido inicial segue as **setas do vento local de cada hora**. A posição do ponto não obriga o avanço a ser radial. Um azimute fixo permite avaliar contra-vento; radial exterior é alternativa explícita. No modo a favor do vento, esse fator é favorável por construção quando o vento ultrapassa o limiar; não representa todas as frentes de um incêndio.
5. Abrir resultados guardados e escolher/reproduzir horas. Vento, incidência, polígonos e ligações mudam sem recalcular. As referências dos resultados antigos são preservadas.
6. Alternar CPS potencial, incidência solar, orientação e declive; clicar nos polígonos e setas; exportar GeoJSON. A cor das setas representa intensidade e a ponta indica para onde sopra.

## Arquitetura e limites

O NAS serve a página, aplica sessão/CSRF e associa resultados à conta. O broker dedicado escuta no host apenas em 127.0.0.1:8190; não executa modelos de vento, relevo ou propagação. O workflow privado `web-firepotential.yml` executa WindNinja 4.0.0 oficial, com SHA-256 fixo, em GitHub Actions. Jobs de alinhamento não instalam o motor físico opcional do simulador.

O resultado compacto é emitido nos logs privados com compressão, limites e SHA-256. O NAS verifica e persiste em PostGIS, esquema `firepotential`, tabelas jobs/polygons/links. A credencial GitHub existe só no servidor. Não há tokens no navegador nem cópia da credencial do computador. Esta entrega evita o limite de armazenamento de artefactos encontrado na conta GitHub.

Polígonos contíguos são agregados por combinação/regimes de vento, subida/descida e exposição. Pontuação igual não basta se os fatores diferem. Após agregação, a rede é reconstruída das fronteiras comuns: sem ligações internas antigas, duplicadas ou sem polígonos. Geometria analítica é separada da geometria arredondada (arcos partilhados Chaikin,2 iterações, junções fixas). Chave persistente:(job,hora,ID); um número não identifica a mesma região entre horas.

Cobertura internacional depende do MDT e da previsão. O motor escolhe UTM por zona/hemisfério ou projeção polar, mantendo coordenadas de saída WGS84 e vetores este/norte verdadeiros. Limites atuais: 24 km por lado,1–6 horas, latitude entre -84.8° e 84.8°. Zonas que atravessem 180° devem ser divididas. Ausência de dados bloqueia o cálculo; não se inventa relevo ou vento.

WindNinja usa rugosidade fixa de terreno aberto, uma hipótese aerodinâmica, não um mapa de vegetação. MDT Terrarium/Mapzen-AWS reprojetado a 100 m e buffer 25%; o produto cartográfico usa a resolução de análise declarada. Campos do buffer exterior não são entregues como se estivessem dentro da área escolhida. O vento a 10 m acima da cobertura não tem equivalência a 10 m AGL validada localmente. Os modelos térmico diurno e de estabilidade estão desligados.

Exposição solar é **incidência geométrica potencial**, aproximação parcial ao pré-aquecimento CPS. Não há temperatura de combustível medida, memória térmica calibrada, sombra montanhosa ou nuvens assimiladas. Limiares 0.5 m/s, 60°, 5° e 0.35 são hipóteses do protótipo, não regras numéricas universais de Campbell. CPS requer confronto com assinaturas observadas para uso operacional.

## Integração futura na Platform e no simulador

`integration/platform-entry.js` acrescenta uma entrada própria na área Platform. Usar ligação/página própria; não substituir o simulador nem abrir o broker diretamente. O portal preserva a identidade e o controlo de acesso existentes, sem herança automática de administração.

API na mesma origem, com sessão autorizada:
- `POST /api/firepotential/jobs`: `{bbox,origin,time,hours,vegetation:'grass',travel_mode:'wind'}`; origem GeoJSON Point/Polygon explícita. `X-CSRF-Token` do `/api/me` é necessário para escrita.
- `GET /api/firepotential/jobs`: resultados da própria conta, com área/hora/resumo.
- `GET /api/firepotential/jobs/UUID`: estado.
- `GET /api/firepotential/jobs/UUID/result`: campos horários u/v, polígonos analíticos/display, adjacência e metadados. O motor consumidor deve usar os campos, não os traços das setas desenhadas.
- `/firepotential/?job=UUID`: abrir um resultado depois de entrar no portal.

No GeoJSON de exportação, `schema_version=firepotential/1.0`, `solver_ready=false`, `operational=false`. `potential_polygon` é analítico e `potential_polygon_display` é visual. Setas verdes são apenas referências, sem tempos de chegada. O consumidor físico terá os seus próprios combustíveis, humidades e validação.

## Fontes e mapas

- ECMWF IFS 0.25 via Open-Meteo: https://open-meteo.com/en/docs . Consulta e validade identificadas; emissão/ciclo não fornecidos permanecem nulos. Inicialização regional não é assimilação automática de estações; respeitar termos do fornecedor.
- IPMA: https://api.ipma.pt/ . Estações/observações de Portugal, classes oficiais de rumo; dados ausentes e horas antigas mantêm-se explícitos. Aldeia usa uma projeção pública do arquivo IGNISPYRO, sem credenciais WU; altura observada não verificada.
- MTG FRP LSA SAF: https://lsa-saf.eumetsat.int/en/data/products/fire-products/mtfrp/ . Snapshot oficial datado sobre a Europa, CC BY 4.0, produto em demonstração; não é perímetro nem modifica o CPS. Cobertura/latência impedem chamar-lhe vigilância global em tempo real.
- Relevo: Mapzen/AWS/Terrarium; atribuições https://github.com/tilezen/joerd/blob/master/docs/attribution.md . Resolução/fonte original variam geograficamente.
- Sete fundos: OpenTopoMap, OpenStreetMap, híbrido/satélite/topográfico/cinza Esri e Carta Militar Itinerária CIGeoE 1:500 000 (Portugal continental). Carta25k/50k requer licenciamento; não incluído. https://www.igeoe.pt/index.php?id=237 . Mudar o mapa base não altera cálculos; créditos no mapa.
- Logótipo oficial fornecido pelo utilizador; direitos da marca IGNISPYRO preservados.

## Desenvolvimento

Servir `dist/` com HTTP ou executar `node serve.cjs` para visualização local. O fluxo cloud operacional usa o portal, sem motor local. `engine/gateway.cjs` é uma ponte local histórica, não requisito desta instalação.

Verificações: `node test.cjs`, `node test-topology.cjs`, `node test-weather.cjs`, `node test-data.cjs`, `node test-ninja.cjs`, `node test-global.cjs`; `python -m unittest discover -s engine -p test_global_extent.py`. Pages verifica e publica `dist/`; atualiza observações/MTG em agenda sujeita ao fornecedor e ao GitHub. O navegador não envia outro trabalho cloud só por alterar uma hora.
