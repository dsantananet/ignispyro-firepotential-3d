# CPS: estudo e contrato do FirePotential

## Base documental
- *WILDFIRE analyst course*, pp.17-21 e29-31; figuras15 (inflamabilidade/exposição),18 (vento local diário),19 (alinhamento). CTFC: https://firefficient.ctfc.cat/wp-content/uploads/2014/02/WILDFIRE-analyst-course_v2.pdf
- *AFAN D2.5 Guidelines on the use of tools*, p.19: CPS como método de observação e comunicação do comportamento.
- Doug Campbell, *The Fire Behavior Language*, pp.1,3-6,8-9, cópia fornecida pelo utilizador: forças independentes; combustível quente/frio; subida/descida da curva; assinaturas observadas; mapa e validade temporal.
- Campbell e Schubert, *The Art of Wildland Firefighting*: https://www.emxsys.com/documentation/references/Campbell_and_Schubert_2009_The%20Art%20Of%20Wildland%20Firefighting.pdf

## O que o CPS significa
O alinhamento avalia vento, declive e pré-aquecimento relativamente ao avanço de um segmento de frente. A mesma meteorologia pode produzir forças favoráveis num flanco e desfavoráveis noutro. Igual pontuação não significa igual combinação de forças ou igual velocidade de propagação.

O exemplo do curso é uma frente na base de vertente sul ao meio-dia com vento sul: sobe, acompanha o vento e encontra combustível aquecido (3/3). Às08h, a vertente quente de referência é este, pelo que a mesma frente fica2/3. Com vento norte, perde o vento e fica1/3. Cruzar uma cumeada pode inverter a subida para descida e mudar exposição e vento local. Estes exemplos são explicação qualitativa, não valores universais de ângulos ou ROS.

Exposição no hemisfério norte: sequência típica este de manhã, sul a meio do dia, oeste à tarde; norte tende a menor aquecimento. A geometria solar deve usar latitude, data, hora e normal da vertente, e não hardcode norte/sul: no hemisfério sul a situação inverte-se. Aquecimento e arrefecimento ao longo da curva não são temperatura do ar. O gráfico com eixo em km/h do curso é vento local diário, não temperatura de combustível.

## Implementação atual e limites
- FirePotential é autónomo, sem mapa/modelo de vegetação, carga de combustível, humidade ou propagação física.
- O modo inicial é potencial no sentido das setas do vento local de cada hora. A origem define a zona; não força avanço radial descendente. Neste modo, vento é favorável por construção quando tem velocidade suficiente. Isso não descreve automaticamente uma frente observada que avance contra o vento.
- Azimute do analista permite avaliar avanço fixo contra ou a favor do vento; modo radial exterior é uma referência alternativa explícita. O modo é guardado no resultado; resultados antigos não são recoloridos como se tivessem sido recalculados.
- Sol é incidência geométrica potencial. Não há medição/validação de temperatura de combustível, humidade, sombreamento topográfico, nuvens ou memória térmica. Não chamar ao terceiro fator pré-aquecimento medido ou disponibilidade real da vegetação.
- Os limiares0.5m/s,60graus,5graus de declive e0.35 de incidência são hipóteses do protótipo. Os documentos estudados não os estabelecem como regras numéricas universais de Campbell.
- WindNinja é nativo e usa relevo e vento horário ECMWF. Rugosidade fixa de terreno aberto é uma hipótese aerodinâmica, não vegetação assimilada. O modelo térmico diurno WindNinja está desligado; não afirmar que as brisas térmicas do gráfico foram calculadas.
- Cada região agrupa células contíguas com a mesma combinação/regimes. As ligações são fronteiras comuns dos polígonos finais, sem tempos de passagem ou probabilidades. Chave persistente:(job,hora,polígono); o númeroP1 não identifica a mesma região entre horas.
- Uso mundial onde o MDT e a previsão têm cobertura. Projeções métricas por hemisfério, tratamento polar e limites explícitos do fornecedor; regiões que atravessem o antimeridiano devem ser divididas. Falta de dados bloqueia a análise.

## Próxima evolução científica
Separar uma camada de pré-aquecimento potencial da simples incidência, com curva diária/aquecer/arrefecer e evidência de radiação/sombra; validar com observações locais. Qualquer estimativa térmica deve ter método e incerteza identificados. O consumidor simulador terá os seus próprios combustíveis, humidades e física e poderá usar estas camadas, sem transformar a pontuação CPS numa velocidade automática.
