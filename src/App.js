import React, {Component} from 'react';
import './App.css';
import io from 'socket.io-client'
import 'bootstrap/dist/css/bootstrap.min.css';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

class App extends Component {
  constructor(){
    super();

    this.socket = io('wss://le-18262636.bitzonte.com',{path:'/stocks'});

    this.state = {
      connected: true,
      connected_string: 'Disconnect',
      stocks:{},
      exchanges: {},
      name_tricker: {},
      exchange_total_volume: 0
    };
  }

  activate(){

    this.socketStocks()
    this.socketExchanges()

  }

  componentDidMount(){
    this.activate()
  }

  socketBuy(){
    this.socket.on('BUY', (buy_data) => this.handleSocketBuy(buy_data));
    
  }

  handleSocketBuy(data){
    var stock_dict = {...this.state.stocks}

    const key = data.ticker

    stock_dict[key]["buy_volume"] += data.volume
    stock_dict[key]["total_volume"] += data.volume

    var total = this.state.exchange_total_volume + data.volume
    this.setState({exchange_total_volume:total})

    this.setState({stocks:stock_dict})

  }

  handleSocketSell(data){
    var stock_dict = {...this.state.stocks}

    const key = data.ticker

    stock_dict[key]["sell_volume"] += data.volume
    stock_dict[key]["total_volume"] += data.volume

    var total = this.state.exchange_total_volume + data.volume
    this.setState({exchange_total_volume:total})

    this.setState({stocks:stock_dict})

  }

  socketSell(){
    this.socket.on('SELL', (sell_data) => this.handleSocketSell(sell_data));

  }

  socketUpdate(){
    this.socket.on('UPDATE', (update_data) => this.handleSocketUpdate(update_data));

  }

  handleSocketUpdate(data){

    const key = data.ticker
    var stock_dict = {...this.state.stocks}

    if (stock_dict[key]["historic_higher"] < data.value) {
      stock_dict[key]["historic_higher"] = data.value
    }
    if (stock_dict[key]["historic_lower"] === 0){
      stock_dict[key]["historic_lower"] = data.value
    }

    if (stock_dict[key]["historic_lower"] > data.value) {
      stock_dict[key]["historic_lower"] = data.value
    }
    stock_dict[key]["variation"] =  Number(((stock_dict[key]["last_price"] - data.value)/data.value) * 100).toFixed(3)

    stock_dict[key]["last_price"] = data.value
    var time = this.timeConverter(data.time)
    stock_dict[key]["chart_info"].push({price :data.value,'time':time})

    this.setState({stocks:stock_dict})


  }

  socketExchanges(){
    this.socket.emit('EXCHANGES')
    this.socket.once('EXCHANGES', (exchange_data) => this.handleSocketExchange(exchange_data));

  }

  handleSocketExchange(data){
    var exchange_dict = {}

    for(var exchange in data){
      exchange_dict[exchange] = data[exchange]
    }

    this.setState({exchanges:exchange_dict})
    
  }
  
  socketStocks(){
    this.socket.emit('STOCKS')
    this.socket.once('STOCKS', (stock_data) => this.handleSocketStocks(stock_data))

  }

  handleSocketStocks(data){
    var stock_dict = {...this.state.stocks}
    data.map(stock_data=>
      stock_dict[stock_data.ticker] = {
        "company_name":stock_data.company_name,
        "country": stock_data.country,
        "quote_base":stock_data.quote_base,
        "buy_volume":0,
        "sell_volume":0,
        "total_volume":0,
        "historic_higher":0,
        "historic_lower":0,
        "last_price": 0,
        "variation": 0,
        "chart_info": []

      }
      )
      this.setState({stocks:stock_dict})
      var name_ticker_dict = {}

      data.map(stock_data=>
        name_ticker_dict[stock_data.company_name]=stock_data.ticker)

      this.setState({name_tricker:name_ticker_dict})
      
      this.socketBuy()
      this.socketSell()
      this.socketUpdate()
  }

  connectedState(){
    if(this.state.connected){
        this.socket.disconnect();
        this.setState({connected_string: 'Connect'})

      }
      else{
        this.socket.connect();
        this.setState({connected_string: 'Disconnect'})
      }
      this.setState(prevState=>({connected: !prevState.connected}))
  }

  exchangeBuyVolume(key){

    //var result = {"buy":0,"sell":0,"total":0,"length":0, "participation":0}
    var buy = 0
    const exchange = this.state.exchanges
    const stocks = this.state.stocks
    const translate = this.state.name_tricker

    var companies = exchange[key]["listed_companies"]
    companies.forEach(company => 
      buy += stocks[translate[company]]["buy_volume"])    

    return buy

  }

  exchangeSellVolume(key){

    var sell = 0
    const exchange = this.state.exchanges
    const stocks = this.state.stocks
    const translate = this.state.name_tricker

    var companies = exchange[key]["listed_companies"]

    companies.forEach(company => 
      sell += stocks[translate[company]]["sell_volume"])   

    return sell

  }

  exchangeTotalVolume(key){

    var total = 0
    const exchange = this.state.exchanges
    const stocks = this.state.stocks
    const translate = this.state.name_tricker

    var companies = exchange[key]["listed_companies"]

    companies.forEach(company => 
      total += stocks[translate[company]]["total_volume"])   

    return total

  }


  exchangeShareAmount(key){

    const exchange = this.state.exchanges

    var companies = exchange[key]["listed_companies"]

    return companies.length

  }


  exchangeMarketShare(key,total_volume){

    var total = 0
    var market_share = 0
    const exchange = this.state.exchanges
    const stocks = this.state.stocks
    const translate = this.state.name_tricker

    var companies = exchange[key]["listed_companies"]

    companies.forEach(company => 
      total += stocks[translate[company]]["total_volume"])   

    market_share = Number((total/total_volume)*100).toFixed(3)


    return market_share

  }

  timeConverter(UNIX_timestamp){ //from stackoverflow
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + hour + ':' + min + ':' + sec ;
    return time;
  }
  numberWithCommas(x) { //from stackoverflow
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
  render(){
    const {stocks} = this.state
    const {exchanges} = this.state
    const total_volume = this.state.exchange_total_volume

    return (
      <div className="App">
        
        <header className="App-header">
        <link
        rel="stylesheet"
        href="https://maxcdn.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css"
        integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh"
        crossorigin="anonymous"
        />
        <div className="margin-div">
        <button onClick={()=>this.connectedState()}>{this.state.connected_string}</button>
        </div>
        <div className="margin-div">
        <h1>EXCHANGES</h1>
        </div>
        <table class="table">
        <thead class="thead-dark">
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Exchange Name</th>
            <th scope="col">Country</th>
            <th scope="col">Address</th>
            <th scope="col">Buy Volume</th>
            <th scope="col">Sell Volume</th>
            <th scope="col">Total Volume</th>
            <th scope="col">Market Share</th>
            <th scope="col">Amount of Shares</th>


          </tr>
        </thead>
        {Object.keys(exchanges).map((key,index)=>
        <tbody>
          <tr>
            <td>{exchanges[key]["exchange_ticker"]}</td>
            <td>{exchanges[key]["name"]}</td>
            <td>{exchanges[key]["country"]}</td>
            <td>{exchanges[key]["address"]}</td>
            <td>{this.numberWithCommas(this.exchangeBuyVolume(key))}</td>
            <td>{this.numberWithCommas(this.exchangeSellVolume(key))}</td>
            <td>{this.numberWithCommas(this.exchangeTotalVolume(key))}</td>
            <td>{this.numberWithCommas(this.exchangeMarketShare(key,total_volume))}%</td>
            <td>{this.numberWithCommas(this.exchangeShareAmount(key))}</td>

          </tr>
      
        </tbody>
 
          )}

      </table>
      <div className="margin-div">
        <h1>EXCHANGES AND COMPANIES</h1>
        <table class="table">
        <thead class="thead-dark">
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Companies</th>

          </tr>
        </thead>
        {Object.keys(exchanges).map((key,index)=>
        <tbody>
          <tr>
          <td>{exchanges[key]["exchange_ticker"]}</td>
            <td>{exchanges[key]["listed_companies"].join()}</td>

          </tr>
      
        </tbody>
 
          )}

      </table>
        </div>
        <div className="margin-div">
        <h1>STOCKS</h1>
        </div>
        <table class="table">
        <thead class="thead-dark">
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Company Name</th>
            <th scope="col">Country</th>
            <th scope="col">Quote Base</th>
            <th scope="col">Buy Volume</th>
            <th scope="col">Sell Volume</th>
            <th scope="col">Total Volume</th>
            <th scope="col">Historic Higher</th>
            <th scope="col">Historic Lower</th>
            <th scope="col">Last price</th>
            <th scope="col">% Variation</th>

          </tr>
        </thead>
        {Object.keys(stocks).map((key,index)=>
        <tbody>
          <tr>
            <td>{key}</td>
            <td>{stocks[key]["company_name"]}</td>
            <td>{stocks[key]["country"]}</td>
            <td>{stocks[key]["quote_base"]}</td>
            <td>{this.numberWithCommas(stocks[key]["buy_volume"])}</td>
            <td>{this.numberWithCommas(stocks[key]["sell_volume"])}</td>
            <td>{this.numberWithCommas(stocks[key]["total_volume"])}</td>
            <td>{this.numberWithCommas(stocks[key]["historic_higher"])}</td>
            <td>{this.numberWithCommas(stocks[key]["historic_lower"])}</td>
            <td>{this.numberWithCommas(stocks[key]["last_price"])}</td>
            <td>{this.numberWithCommas(stocks[key]["variation"])}%</td>
          </tr>
      
        </tbody>

          )}

      </table>
      <h1>CHARTS</h1>
      {Object.keys(stocks).map((key,index)=>


        <div className="margin-div">
          <h4>{key} ({stocks[key]["quote_base"]})</h4>
          <LineChart width={800} height={400} data={[...stocks[key]["chart_info"]]} margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
          <Line type="monotone" dataKey='price' stroke="#82ca9d" activeDot={{ r: 8 }}/>
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <XAxis dataKey="time" tick={{fontSize: 10}}/>
          <YAxis dataKey='price' tick={{fontSize: 10}} domain={["auto", "auto"]}/>
          <Tooltip />
        </LineChart>
        </div>
      )}

        </header>
      </div>
    )
  }
}

export default App;
