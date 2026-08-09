import {useCallback, useEffect, useMemo, useState} from "react";
import {BrowserProvider, Contract, formatEther, formatUnits, isAddress, JsonRpcProvider, parseUnits} from "ethers";
import QRCode from "qrcode";
import {
  ERC20_ABI,
  EXPLORER_URL,
  INVOICE_MANAGER_ABI,
  INVOICE_MANAGER_ADDRESS,
  INVOICE_MANAGER_DEPLOYMENT_BLOCK,
  PHAROS_CHAIN_HEX,
  PHAROS_CHAIN_ID,
  PHAROS_RPC_URL,
  TBT_ADDRESS,
} from "./contracts.js";
import {invoiceIdFromPath, invoicePath, uniqueInvoiceIds} from "./invoice-utils.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EVENT_BLOCK_RANGE = 1000;

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected";
}

function errorMessage(error) {
  return error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message || "Something went wrong";
}

async function queryFilterInRanges(contract, filter, fromBlock, toBlock) {
  const events = [];
  for (let start = fromBlock; start <= toBlock; start += EVENT_BLOCK_RANGE) {
    const end = Math.min(start + EVENT_BLOCK_RANGE - 1, toBlock);
    events.push(...await contract.queryFilter(filter, start, end));
  }
  return events;
}

function App() {
  const readProvider = useMemo(() => new JsonRpcProvider(PHAROS_RPC_URL), []);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [nativeBalance, setNativeBalance] = useState("—");
  const [tokenBalance, setTokenBalance] = useState("—");
  const [nextInvoiceId, setNextInvoiceId] = useState("—");
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("10");
  const sharedInvoiceId = useMemo(() => invoiceIdFromPath(window.location.pathname), []);
  const [invoiceSearch, setInvoiceSearch] = useState(sharedInvoiceId ?? "0");
  const [invoice, setInvoice] = useState(null);
  const [allowance, setAllowance] = useState(0n);
  const [myInvoices, setMyInvoices] = useState([]);
  const [myInvoicesBusy, setMyInvoicesBusy] = useState(false);
  const [myInvoicesError, setMyInvoicesError] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [showShare, setShowShare] = useState(Boolean(sharedInvoiceId));
  const [qrCode, setQrCode] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);

  const onCorrectChain = chainId === PHAROS_CHAIN_ID;
  const maskNetworkData = !account || !onCorrectChain;
  const shareUrl = invoice ? `${window.location.origin}${invoicePath(invoice.id)}` : "";
  const filteredInvoices = myInvoices.filter((item) => {
    if (invoiceFilter === "merchant") return item.merchant.toLowerCase() === account.toLowerCase();
    if (invoiceFilter === "payer") return item.payer.toLowerCase() === account.toLowerCase();
    return true;
  });

  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask is not installed");
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
  }, []);

  const refreshDashboard = useCallback(async (walletAddress = account) => {
    const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, readProvider);
    const token = new Contract(TBT_ADDRESS, ERC20_ABI, readProvider);
    const [nextId, decimals] = await Promise.all([manager.nextInvoiceId(), token.decimals()]);
    setNextInvoiceId(nextId.toString());

    if (walletAddress) {
      const [phrs, tbt] = await Promise.all([
        readProvider.getBalance(walletAddress),
        token.balanceOf(walletAddress),
      ]);
      setNativeBalance(Number(formatEther(phrs)).toFixed(4));
      setTokenBalance(Number(formatUnits(tbt, decimals)).toLocaleString(undefined, {maximumFractionDigits: 4}));
    }
  }, [account, readProvider]);

  const loadMyInvoices = useCallback(async (walletAddress = account) => {
    if (!walletAddress) {
      setMyInvoices([]);
      return;
    }
    try {
      setMyInvoicesBusy(true);
      setMyInvoicesError("");
      const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, readProvider);
      const latestBlock = await readProvider.getBlockNumber();
      const [created, payable] = await Promise.all([
        queryFilterInRanges(
          manager,
          manager.filters.InvoiceCreated(null, walletAddress, null),
          INVOICE_MANAGER_DEPLOYMENT_BLOCK,
          latestBlock,
        ),
        queryFilterInRanges(
          manager,
          manager.filters.InvoiceCreated(null, null, walletAddress),
          INVOICE_MANAGER_DEPLOYMENT_BLOCK,
          latestBlock,
        ),
      ]);
      const ids = uniqueInvoiceIds([...created, ...payable]);
      const items = await Promise.all(ids.map(async (id) => {
        const data = await manager.invoices(id);
        return {
          id,
          merchant: data.merchant,
          payer: data.payer,
          amount: data.amount,
          status: Number(data.status),
        };
      }));
      setMyInvoices(items.sort((left, right) => Number(right.id) - Number(left.id)));
    } catch (error) {
      setMyInvoicesError(errorMessage(error));
    } finally {
      setMyInvoicesBusy(false);
    }
  }, [account, readProvider]);

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) throw new Error("Install MetaMask to continue");
      const accounts = await window.ethereum.request({method: "eth_requestAccounts"});
      const currentChain = await window.ethereum.request({method: "eth_chainId"});
      const walletAddress = accounts[0];
      setAccount(walletAddress);
      setChainId(Number(currentChain));
      await refreshDashboard(walletAddress);
      setNotice({type: "success", text: "Wallet connected"});
    } catch (error) {
      setNotice({type: "error", text: errorMessage(error)});
    }
  }, [refreshDashboard]);

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{chainId: PHAROS_CHAIN_HEX}],
      });
    } catch (error) {
      if (error.code !== 4902) {
        setNotice({type: "error", text: errorMessage(error)});
        return;
      }
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: PHAROS_CHAIN_HEX,
          chainName: "Pharos Atlantic Testnet",
          nativeCurrency: {name: "Pharos", symbol: "PHRS", decimals: 18},
          rpcUrls: [PHAROS_RPC_URL],
          blockExplorerUrls: [EXPLORER_URL],
        }],
      });
    }
  };

  const createInvoice = async (event) => {
    event.preventDefault();
    if (!isAddress(payer) || payer === ZERO_ADDRESS) {
      setNotice({type: "error", text: "Enter a valid payer address"});
      return;
    }
    try {
      setBusy("create");
      const signer = await getSigner();
      const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, signer);
      const tx = await manager.createInvoice(payer, parseUnits(amount, 18));
      setNotice({type: "pending", text: "Creating invoice…", hash: tx.hash});
      const receipt = await tx.wait();
      const createdLog = receipt.logs
        .map((log) => {
          try { return manager.interface.parseLog(log); } catch { return null; }
        })
        .find((log) => log?.name === "InvoiceCreated");
      const createdId = createdLog?.args.invoiceId?.toString();
      if (createdId !== undefined) setInvoiceSearch(createdId);
      setNotice({type: "success", text: `Invoice #${createdId ?? ""} created`, hash: tx.hash});
      await Promise.all([refreshDashboard(account), loadMyInvoices(account)]);
    } catch (error) {
      setNotice({type: "error", text: errorMessage(error)});
    } finally {
      setBusy("");
    }
  };

  const loadInvoice = useCallback(async (event, requestedId = invoiceSearch) => {
    event?.preventDefault();
    try {
      setBusy("load");
      const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, readProvider);
      const token = new Contract(TBT_ADDRESS, ERC20_ABI, readProvider);
      const data = await manager.invoices(requestedId);
      if (data.merchant === ZERO_ADDRESS) throw new Error("Invoice does not exist");
      const currentAllowance = await token.allowance(data.payer, INVOICE_MANAGER_ADDRESS);
      setInvoice({
        id: requestedId,
        merchant: data.merchant,
        payer: data.payer,
        amount: data.amount,
        status: Number(data.status),
      });
      setAllowance(currentAllowance);
    } catch (error) {
      setInvoice(null);
      setNotice({type: "error", text: errorMessage(error)});
    } finally {
      setBusy("");
    }
  }, [invoiceSearch, readProvider]);

  const openInvoice = useCallback(async (invoiceId, updateHistory = true) => {
    setInvoiceSearch(invoiceId);
    setShowShare(false);
    if (updateHistory) window.history.pushState({}, "", invoicePath(invoiceId));
    await loadInvoice(null, invoiceId);
    document.querySelector(".settle-panel")?.scrollIntoView({behavior: "smooth", block: "center"});
  }, [loadInvoice]);

  const copyInvoiceLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice({type: "success", text: "Invoice link copied"});
    } catch {
      setNotice({type: "error", text: "Could not copy the invoice link"});
    }
  };

  const approveInvoice = async () => {
    try {
      setBusy("approve");
      const signer = await getSigner();
      const token = new Contract(TBT_ADDRESS, ERC20_ABI, signer);
      const tx = await token.approve(INVOICE_MANAGER_ADDRESS, invoice.amount);
      setNotice({type: "pending", text: "Approving exact invoice amount…", hash: tx.hash});
      await tx.wait();
      setNotice({type: "success", text: "TBT approved", hash: tx.hash});
      await loadInvoice();
    } catch (error) {
      setNotice({type: "error", text: errorMessage(error)});
    } finally {
      setBusy("");
    }
  };

  const payInvoice = async () => {
    try {
      setBusy("pay");
      const signer = await getSigner();
      const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, signer);
      const tx = await manager.payInvoice(invoice.id);
      setNotice({type: "pending", text: `Paying invoice #${invoice.id}…`, hash: tx.hash});
      await tx.wait();
      setNotice({type: "success", text: `Invoice #${invoice.id} paid`, hash: tx.hash});
      await Promise.all([loadInvoice(), refreshDashboard(account), loadMyInvoices(account)]);
    } catch (error) {
      setNotice({type: "error", text: errorMessage(error)});
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    if (!shareUrl || !showShare) {
      setQrCode("");
      return undefined;
    }
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: {dark: "#11130f", light: "#f1f0e9"},
    })
      .then((value) => { if (active) setQrCode(value); })
      .catch(() => { if (active) setNotice({type: "error", text: "Could not create QR code"}); });
    return () => { active = false; };
  }, [shareUrl, showShare]);

  useEffect(() => {
    refreshDashboard().catch(() => setNextInvoiceId("—"));
    if (!window.ethereum) return undefined;
    const handleAccounts = (accounts) => {
      setAccount(accounts[0] || "");
      if (accounts[0]) {
        refreshDashboard(accounts[0]);
        loadMyInvoices(accounts[0]);
      } else {
        setMyInvoices([]);
      }
    };
    const handleChain = (value) => setChainId(Number(value));
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);
    window.ethereum.request({method: "eth_accounts"}).then(handleAccounts);
    window.ethereum.request({method: "eth_chainId"}).then(handleChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChain);
    };
  }, [loadMyInvoices, refreshDashboard]);

  useEffect(() => {
    if (sharedInvoiceId) loadInvoice(null, sharedInvoiceId);
  }, [loadInvoice, sharedInvoiceId]);

  useEffect(() => {
    const handleNavigation = () => {
      const invoiceId = invoiceIdFromPath(window.location.pathname);
      if (invoiceId) openInvoice(invoiceId, false);
    };
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, [openInvoice]);

  useEffect(() => {
    if (!notice || notice.type === "pending") return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const isPayer = account && invoice && account.toLowerCase() === invoice.payer.toLowerCase();
  const needsApproval = invoice && allowance < invoice.amount;

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="Tucker Invoice home">
          <span className="brand-mark">T</span>
          <span>Tucker Invoice</span>
        </a>
        <div className="nav-actions">
          <span className={`network-pill ${onCorrectChain ? "online" : ""}`}>
            <i /> {onCorrectChain ? "Atlantic live" : "Wrong network"}
          </span>
          {account ? (
            <button className="wallet-button" type="button" onClick={connectWallet}>{shortAddress(account)}</button>
          ) : (
            <button className="primary compact" type="button" onClick={connectWallet}>Connect wallet</button>
          )}
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div>
          <p className="eyebrow">Settlement without the paperwork</p>
          <h1>Invoices that move<br /><em>at network speed.</em></h1>
          <p className="hero-copy">Create, approve, and settle TBT invoices on Pharos Atlantic. Every payment is transparent, final, and yours.</p>
          <div className="hero-actions">
            {!account ? <button className="primary" onClick={connectWallet}>Open your workspace <span>↗</span></button> : null}
            {account && !onCorrectChain ? <button className="primary" onClick={switchNetwork}>Switch to Atlantic</button> : null}
            <a className="text-link" href={`${EXPLORER_URL}/address/${INVOICE_MANAGER_ADDRESS}`} target="_blank" rel="noreferrer">View contract ↗</a>
          </div>
        </div>
        <aside className="hero-card">
          <div className="orb"><span>TBT</span></div>
          <p>Live settlement rail</p>
          <strong>{shortAddress(INVOICE_MANAGER_ADDRESS)}</strong>
          <div className="hero-card-row"><span>Network</span><b>Pharos Atlantic</b></div>
          <div className="hero-card-row"><span>Contract</span><b>Verified</b></div>
        </aside>
      </section>

      <section className="stats shell" aria-label="Account overview">
        <div><span>Your TBT</span><strong>{maskNetworkData ? "—" : tokenBalance}</strong></div>
        <div><span>Gas balance</span><strong>{maskNetworkData ? "—" : nativeBalance} {!maskNetworkData && <small>PHRS</small>}</strong></div>
        <div><span>Atlantic invoices</span><strong>{maskNetworkData ? "—" : nextInvoiceId}</strong></div>
      </section>

      <section className="workspace shell">
        <div className="section-heading">
          <p className="eyebrow">Your workspace</p>
          <h2>Move value with intent.</h2>
        </div>

        {!account || !onCorrectChain ? (
          <div className="gate-card">
            <span>01</span>
            <div><h3>{!account ? "Connect your wallet" : "Switch to Pharos Atlantic"}</h3><p>Connect to create, approve, and settle invoices securely.</p></div>
            <button className="primary" onClick={!account ? connectWallet : switchNetwork}>{!account ? "Connect MetaMask" : "Switch network"}</button>
          </div>
        ) : (
          <div className="action-grid">
            <article className="panel create-panel">
              <div className="panel-number">01</div>
              <div className="panel-header"><div><p className="eyebrow">For merchants</p><h3>Create invoice</h3></div><span className="icon-box">＋</span></div>
              <form onSubmit={createInvoice}>
                <label>Payer address<input value={payer} onChange={(event) => setPayer(event.target.value)} placeholder="0x…" spellCheck="false" /></label>
                <label>Amount<div className="amount-input"><input type="number" min="0.000001" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>TBT</span></div></label>
                <button className="primary full" disabled={busy === "create"}>{busy === "create" ? "Confirming…" : "Create invoice"}<span>→</span></button>
              </form>
            </article>

            <article className="panel settle-panel">
              <div className="panel-number">02</div>
              <div className="panel-header"><div><p className="eyebrow">For payers</p><h3>Find & settle</h3></div><span className="icon-box">↗</span></div>
              <form className="search-form" onSubmit={loadInvoice}>
                <label>Invoice ID<div className="search-input"><input type="number" min="0" value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} /><button disabled={busy === "load"}>Find</button></div></label>
              </form>
              {invoice ? (
                <div className="invoice-card">
                  <div className="invoice-top"><span>Invoice #{invoice.id}</span><b className={invoice.status === 1 ? "paid" : "open"}>{invoice.status === 1 ? "Paid" : "Open"}</b></div>
                  <strong className="invoice-amount">{formatUnits(invoice.amount, 18)} <small>TBT</small></strong>
                  <dl><div><dt>Merchant</dt><dd title={invoice.merchant}>{shortAddress(invoice.merchant)}</dd></div><div><dt>Payer</dt><dd title={invoice.payer}>{shortAddress(invoice.payer)}</dd></div></dl>
                  <div className="share-actions">
                    <button className="tertiary" type="button" onClick={copyInvoiceLink}>Copy link</button>
                    <button className="tertiary" type="button" onClick={() => setShowShare((value) => !value)}>{showShare ? "Hide QR" : "Show QR"}</button>
                  </div>
                  {showShare ? (
                    <div className="share-card">
                      {qrCode ? <img src={qrCode} alt={`QR code for invoice ${invoice.id}`} /> : <span>Creating QR…</span>}
                      <div><strong>Scan to open invoice #{invoice.id}</strong><p>{shareUrl}</p></div>
                    </div>
                  ) : null}
                  {invoice.status === 0 && isPayer ? (
                    needsApproval ? <button className="secondary full" onClick={approveInvoice} disabled={busy === "approve"}>{busy === "approve" ? "Approving…" : `Approve ${formatUnits(invoice.amount, 18)} TBT`}</button>
                      : <button className="primary full" onClick={payInvoice} disabled={busy === "pay"}>{busy === "pay" ? "Paying…" : "Pay invoice"}<span>→</span></button>
                  ) : null}
                  {invoice.status === 0 && !isPayer ? <p className="hint">Connect the payer wallet to settle this invoice.</p> : null}
                </div>
              ) : <p className="empty-state">Enter an invoice ID to review its amount, payer, and status.</p>}
            </article>
          </div>
        )}

        {account && onCorrectChain ? (
          <section className="invoice-library" aria-labelledby="my-invoices-title">
            <div className="library-header">
              <div><p className="eyebrow">On-chain activity</p><h3 id="my-invoices-title">My invoices</h3></div>
              <button className="secondary compact" type="button" onClick={() => loadMyInvoices(account)} disabled={myInvoicesBusy}>{myInvoicesBusy ? "Refreshing…" : "Refresh"}</button>
            </div>
            <div className="filter-tabs" role="group" aria-label="Filter invoices">
              {[["all", "All"], ["merchant", "Created by me"], ["payer", "Payable by me"]].map(([value, label]) => (
                <button key={value} className={invoiceFilter === value ? "active" : ""} type="button" onClick={() => setInvoiceFilter(value)}>{label}</button>
              ))}
            </div>
            {myInvoicesError ? <p className="library-message error-text">Could not load invoices: {myInvoicesError}</p> : null}
            {!myInvoicesError && !myInvoicesBusy && filteredInvoices.length === 0 ? <p className="library-message">No invoices match this filter yet.</p> : null}
            <div className="invoice-list">
              {filteredInvoices.map((item) => (
                <button key={item.id} className="invoice-row" type="button" onClick={() => openInvoice(item.id)}>
                  <span><small>Invoice</small>#{item.id}</span>
                  <span><small>Amount</small>{formatUnits(item.amount, 18)} TBT</span>
                  <span><small>Role</small>{item.merchant.toLowerCase() === account.toLowerCase() ? "Merchant" : "Payer"}</span>
                  <b className={item.status === 1 ? "paid" : "open"}>{item.status === 1 ? "Paid" : "Open"}</b>
                  <i>↗</i>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <footer className="shell">
        <span>Built on Pharos Atlantic</span>
        <a href={`${EXPLORER_URL}/address/${TBT_ADDRESS}`} target="_blank" rel="noreferrer">TBT contract ↗</a>
      </footer>

      {notice ? (
        <div className={`toast ${notice.type}`} role="status">
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
          <span>{notice.type === "pending" ? "◌" : notice.type === "success" ? "✓" : "!"}</span>
          <div><strong>{notice.type === "error" ? "Action failed" : notice.type === "pending" ? "Transaction pending" : "All set"}</strong><p>{notice.text}</p>{notice.hash ? <a href={`${EXPLORER_URL}/tx/${notice.hash}`} target="_blank" rel="noreferrer">View transaction ↗</a> : null}</div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
