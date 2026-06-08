# HealthMonitor 🫀

Sistema de monitorização de sinais vitais e deteção de quedas em tempo real, desenvolvido com ESP32, MAX30100, Raspberry Pi e Node.js.

---

## Arquitetura do sistema

```
ESP32 (sensor) → MQTT (broker.hivemq.com) → Node-RED (Raspberry Pi) → HTTP POST → Servidor Node.js (PC) → Dashboard Web
```

| Componente | Função |
|---|---|
| ESP32 + MAX30100 | Lê frequência cardíaca e SpO2 |
| Sensor de vibração | Deteta quedas e impactos |
| Buzzer | Alerta sonoro para BPM alto |
| MQTT | Transporte dos dados via Wi-Fi |
| Node-RED (Raspberry Pi) | Recebe MQTT e reencaminha via HTTP |
| Node.js + SQLite (PC) | Armazena dados e serve o dashboard |

---

## Tópicos MQTT

| Tópico | Payload | Descrição |
|---|---|---|
| `healthsensor` | `{"heartRate": 87.8, "spO2": 95}` | Sinais vitais (1x por segundo) |
| `healthsensor/beat` | `1` | Batimento detetado |
| `healthsensor/queda` | `{"tipo":"queda","intensidade":"MUITO_FORTE","contagem":65}` | Alerta de queda |

---

## Pré-requisitos

### Hardware
- ESP32
- Sensor MAX30100 (oxímetro + frequência cardíaca)
- Sensor de vibração
- Buzzer
- Raspberry Pi (com Node-RED instalado)
- PC com Node.js

### Software
- [Arduino IDE](https://www.arduino.cc/en/software)
- [Node.js 18+](https://nodejs.org)
- Node-RED (no Raspberry Pi)

---

## Bibliotecas Arduino

Instala pelo **Library Manager** do Arduino IDE:

| Biblioteca | Versão recomendada |
|---|---|
| `PubSubClient` | 2.8+ |
| `MAX30100lib` | 1.2+ |
| `Wire` | incluída no ESP32 |
| `WiFi` | incluída no ESP32 |

---

## Instalação

### 1. ESP32 — código Arduino

1. Abre o ficheiro `codigobuzzercomvibracaoqueda.ino` no Arduino IDE
2. Edita as credenciais Wi-Fi:
```cpp
const char* ssid     = "O_TEU_WIFI";
const char* password = "A_TUA_PASSWORD";
```
3. Faz upload para o ESP32
4. Abre o **Monitor Série** (115200 baud) para confirmar a ligação

### 2. Servidor Node.js — PC

```bash
# Clona o repositório
git clone https://github.com/teu-utilizador/healthmonitor.git
cd healthmonitor

# Instala as dependências
npm install

# Inicia o servidor
node server.js
```

O servidor fica disponível em `http://localhost:3000`

### 3. Node-RED — Raspberry Pi

Acede ao Node-RED em `http://IP_DO_RASPI:1880` e configura dois fluxos:

**Sinais vitais:**
```
[mqtt in: healthsensor] → [function] → [http request POST /vitals]
```

**Quedas:**
```
[mqtt in: healthsensor/queda] → [function] → [http request POST /queda]
```

**Função para sinais vitais:**
```javascript
msg.payload = {
    heartRate: msg.payload.heartRate,
    spO2: msg.payload.spO2
};
return msg;
```

**Função para quedas:**
```javascript
msg.payload = {
    tipo: msg.payload.tipo,
    intensidade: msg.payload.intensidade,
    contagem: msg.payload.contagem
};
return msg;
```

**HTTP Request (ambos os nós):**
- Method: `POST`
- URL: `http://IP_DO_PC:3000/vitals` ou `http://IP_DO_PC:3000/queda`
- Return: `a parsed JSON object`

> Para descobrir o IP do PC: `ipconfig` no terminal do PC → **Endereço IPv4**

---

## Estrutura do projeto

```
healthmonitor/
├── server.js               ← servidor Express + SQLite
├── package.json
├── package-lock.json
├── .gitignore
├── public/
│   └── index.html          ← dashboard web
└── codigobuzzercomvibracaoqueda.ino  ← código ESP32
```

---

## Dependências Node.js

| Pacote | Versão | Função |
|---|---|---|
| `express` | ^5.2.1 | Servidor HTTP |
| `better-sqlite3` | ^12.10.0 | Base de dados local |
| `cors` | ^2.8.6 | Permitir pedidos cross-origin |

---

## API Endpoints

| Método | URL | Descrição |
|---|---|---|
| `POST` | `/vitals` | Recebe heartRate + spO2 do Node-RED |
| `POST` | `/queda` | Recebe alertas de queda |
| `GET` | `/api/vitals?limit=60` | Últimas N leituras |
| `GET` | `/api/quedas` | Últimas 20 quedas |
| `GET` | `/api/stats` | Médias e contagens |

---

## Dashboard

Acede em `http://localhost:3000` após iniciar o servidor.

Funcionalidades:
- Frequência cardíaca em tempo real (gráfico + valor atual)
- Saturação de oxigénio (SpO2) em tempo real
- Médias dos últimos 5 minutos
- Histórico de quedas e impactos com timestamp
- Alertas visuais: BPM > 100 fica vermelho, SpO2 < 94% também
- Atualização automática a cada 2 segundos

---

## Alertas automáticos

| Condição | Ação |
|---|---|
| BPM > 100 | Buzzer liga + valor fica vermelho no dashboard |
| SpO2 < 94% | Valor fica vermelho no dashboard |
| Vibração ≥ 30 contagens / 500ms | Publica alerta MQTT de impacto |
| Vibração ≥ 60 contagens / 500ms | Publica alerta MQTT de queda |

---

## Pinagem ESP32

| Pino | Componente |
|---|---|
| GPIO 32 | SDA (MAX30100) |
| GPIO 27 | SCL (MAX30100) |
| GPIO 25 | Buzzer |
| GPIO 21 | Sensor de vibração |

---

## Desenvolvido com

- [ESP32](https://www.espressif.com/en/products/socs/esp32)
- [MAX30100](https://www.maximintegrated.com/en/products/sensors/MAX30100.html)
- [Node.js](https://nodejs.org)
- [Express](https://expressjs.com)
- [SQLite](https://www.sqlite.org)
- [Node-RED](https://nodered.org)
- [Chart.js](https://www.chartjs.org)
