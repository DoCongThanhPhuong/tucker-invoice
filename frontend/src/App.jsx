import {useCallback, useEffect, useMemo, useState} from "react";
import {BrowserProvider, Contract, formatEther, formatUnits, isAddress, JsonRpcProvider, parseUnits} from "ethers";
import QRCode from "qrcode";
import {
  DEFAULT_V2_TOKENS,
  ERC20_ABI,
  EXPLORER_URL,
  INVOICE_MANAGER_ABI,
  INVOICE_MANAGER_ADDRESS,
  INVOICE_MANAGER_DEPLOYMENT_BLOCK,
  INVOICE_MANAGER_V2_ABI,
  INVOICE_MANAGER_V2_ADDRESS,
  INVOICE_MANAGER_V2_DEPLOYMENT_BLOCK,
  PHAROS_CHAIN_HEX,
  PHAROS_CHAIN_ID,
  PHAROS_RPC_URL,
  TBT_ADDRESS,
} from "./contracts.js";
import {
  deriveV2InvoiceStatus,
  invoiceIdFromPath,
  invoicePath,
  textToReferenceHash,
  uniqueInvoiceIds,
  v2InvoiceIdFromPath,
  v2InvoicePath,
} from "./invoice-utils.js";

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
  const [appVersion, setAppVersion] = useState(INVOICE_MANAGER_V2_ADDRESS ? "v2" : "v1"); // "v2" or "v1"
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [nativeBalance, setNativeBalance] = useState("—");
  const [tokenBalance, setTokenBalance] = useState("—");
  const [nextInvoiceId, setNextInvoiceId] = useState("—");

  // Creation form state
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("10");
  const [selectedTokenAddress, setSelectedTokenAddress] = useState(TBT_ADDRESS);
  const [customReference, setCustomReference] = useState("INV-2026-001");
  const [dueDateString, setDueDateString] = useState(() => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return future.toISOString().slice(0, 16);
  });
  const [tokenMeta, setTokenMeta] = useState({symbol: "TBT", decimals: 18, name: "Tucker Builder Token"});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Invoice view & search state
  const initialV2Id = useMemo(() => v2InvoiceIdFromPath(window.location.pathname), []);
  const initialV1Id = useMemo(() => invoiceIdFromPath(window.location.pathname), []);
  const [invoiceSearch, setInvoiceSearch] = useState(initialV2Id || initialV1Id || "0");
  const [invoice, setInvoice] = useState(null);
  const [allowance, setAllowance] = useState(0n);
  const [showReceipt, setShowReceipt] = useState(false);

  // Dashboard & list state
  const [myInvoices, setMyInvoices] = useState([]);
  const [myInvoicesBusy, setMyInvoicesBusy] = useState(false);
  const [myInvoicesError, setMyInvoicesError] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all"); // "all", "v2", "v1"

  // Share & QR
  const [showShare, setShowShare] = useState(Boolean(initialV2Id || initialV1Id));
  const [qrCode, setQrCode] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);

  const onCorrectChain = chainId === PHAROS_CHAIN_ID;
  const maskNetworkData = !account || !onCorrectChain;

  const shareUrl = useMemo(() => {
    if (!invoice) return "";
    const path = invoice.version === "v2" ? v2InvoicePath(invoice.id) : invoicePath(invoice.id);
    return `${window.location.origin}${path}`;
  }, [invoice]);

  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask is not installed");
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
  }, []);

  // Fetch token metadata on-chain
  const loadTokenMetadata = useCallback(async (tokenAddress) => {
    if (!isAddress(tokenAddress) || tokenAddress === ZERO_ADDRESS) return;
    try {
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, readProvider);
      const [sym, dec, name] = await Promise.all([
        tokenContract.symbol().catch(() => "TOKEN"),
        tokenContract.decimals().catch(() => 18),
        tokenContract.name().catch(() => "ERC-20 Token"),
      ]);
      setTokenMeta({symbol: sym, decimals: Number(dec), name});
    } catch {
      setTokenMeta({symbol: "TBT", decimals: 18, name: "Tucker Builder Token"});
    }
  }, [readProvider]);

  useEffect(() => {
    loadTokenMetadata(selectedTokenAddress);
  }, [loadTokenMetadata, selectedTokenAddress]);

  const refreshDashboard = useCallback(async (walletAddress = account) => {
    try {
      const v2Manager = INVOICE_MANAGER_V2_ADDRESS
        ? new Contract(INVOICE_MANAGER_V2_ADDRESS, INVOICE_MANAGER_V2_ABI, readProvider)
        : null;
      const v1Manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, readProvider);
      const token = new Contract(TBT_ADDRESS, ERC20_ABI, readProvider);

      const [nextV1, nextV2, decimals] = await Promise.all([
        v1Manager.nextInvoiceId().catch(() => 0n),
        v2Manager ? v2Manager.nextInvoiceId().catch(() => 0n) : Promise.resolve(0n),
        token.decimals().catch(() => 18),
      ]);

      const totalCount = (Number(nextV1) + Number(nextV2)).toString();
      setNextInvoiceId(totalCount);

      if (walletAddress) {
        const [phrs, tbt] = await Promise.all([
          readProvider.getBalance(walletAddress),
          token.balanceOf(walletAddress),
        ]);
        setNativeBalance(Number(formatEther(phrs)).toFixed(4));
        setTokenBalance(Number(formatUnits(tbt, decimals)).toLocaleString(undefined, {maximumFractionDigits: 4}));
      }
    } catch {
      setNextInvoiceId("—");
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
      const latestBlock = await readProvider.getBlockNumber();

      const items = [];

      // Query V1
      const v1Manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, readProvider);
      const [v1Created, v1Payable] = await Promise.all([
        queryFilterInRanges(v1Manager, v1Manager.filters.InvoiceCreated(null, walletAddress, null), INVOICE_MANAGER_DEPLOYMENT_BLOCK, latestBlock),
        queryFilterInRanges(v1Manager, v1Manager.filters.InvoiceCreated(null, null, walletAddress), INVOICE_MANAGER_DEPLOYMENT_BLOCK, latestBlock),
      ]);
      const v1Ids = uniqueInvoiceIds([...v1Created, ...v1Payable]);
      const v1Items = await Promise.all(v1Ids.map(async (id) => {
        const data = await v1Manager.invoices(id);
        return {
          id,
          version: "v1",
          merchant: data.merchant,
          payer: data.payer,
          paymentToken: TBT_ADDRESS,
          tokenSymbol: "TBT",
          tokenDecimals: 18,
          amount: data.amount,
          dueDate: null,
          referenceHash: null,
          statusNum: Number(data.status),
          derivedStatus: Number(data.status) === 1 ? "Paid" : "Open",
        };
      }));
      items.push(...v1Items);

      // Query V2 if deployed / configured
      if (INVOICE_MANAGER_V2_ADDRESS) {
        const v2Manager = new Contract(INVOICE_MANAGER_V2_ADDRESS, INVOICE_MANAGER_V2_ABI, readProvider);
        const [v2Created, v2Payable] = await Promise.all([
          queryFilterInRanges(v2Manager, v2Manager.filters.InvoiceCreated(null, walletAddress, null), INVOICE_MANAGER_V2_DEPLOYMENT_BLOCK, latestBlock),
          queryFilterInRanges(v2Manager, v2Manager.filters.InvoiceCreated(null, null, walletAddress), INVOICE_MANAGER_V2_DEPLOYMENT_BLOCK, latestBlock),
        ]);
        const v2Ids = uniqueInvoiceIds([...v2Created, ...v2Payable]);
        const v2Items = await Promise.all(v2Ids.map(async (id) => {
          const data = await v2Manager.invoices(id);
          let sym = "TBT";
          let dec = 18;
          try {
            const tokenContract = new Contract(data.paymentToken, ERC20_ABI, readProvider);
            [sym, dec] = await Promise.all([tokenContract.symbol(), tokenContract.decimals()]);
          } catch {
            // fallback
          }
          const nowSec = Math.floor(Date.now() / 1000);
          return {
            id,
            version: "v2",
            merchant: data.merchant,
            payer: data.payer,
            paymentToken: data.paymentToken,
            tokenSymbol: sym,
            tokenDecimals: Number(dec),
            amount: data.amount,
            dueDate: Number(data.dueDate),
            referenceHash: data.referenceHash,
            statusNum: Number(data.status),
            derivedStatus: deriveV2InvoiceStatus(data.status, data.dueDate, nowSec),
          };
        }));
        items.push(...v2Items);
      }

      setMyInvoices(items.sort((a, b) => Number(b.id) - Number(a.id)));
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

  const submitCreateInvoice = async () => {
    setShowConfirmationModal(false);
    if (!isAddress(payer) || payer === ZERO_ADDRESS) {
      setNotice({type: "error", text: "Enter a valid payer address"});
      return;
    }

    try {
      setBusy("create");
      const signer = await getSigner();

      if (appVersion === "v2") {
        if (!INVOICE_MANAGER_V2_ADDRESS) {
          throw new Error("InvoiceManagerV2 address is not configured");
        }
        const manager = new Contract(INVOICE_MANAGER_V2_ADDRESS, INVOICE_MANAGER_V2_ABI, signer);
        const dueTimestamp = Math.floor(new Date(dueDateString).getTime() / 1000);
        if (dueTimestamp <= Math.floor(Date.now() / 1000)) {
          throw new Error("Due date must be in the future");
        }
        const refHash = textToReferenceHash(customReference);
        const parsedAmt = parseUnits(amount, tokenMeta.decimals);

        const tx = await manager.createInvoice(payer, selectedTokenAddress, parsedAmt, dueTimestamp, refHash);
        setNotice({type: "pending", text: "Creating V2 invoice on Pharos…", hash: tx.hash});
        const receipt = await tx.wait();
        const createdLog = receipt.logs
          .map((log) => { try { return manager.interface.parseLog(log); } catch { return null; } })
          .find((log) => log?.name === "InvoiceCreated");
        const createdId = createdLog?.args.invoiceId?.toString();
        if (createdId !== undefined) setInvoiceSearch(createdId);
        setNotice({type: "success", text: `V2 Invoice #${createdId ?? ""} created`, hash: tx.hash});
      } else {
        const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, signer);
        const tx = await manager.createInvoice(payer, parseUnits(amount, 18));
        setNotice({type: "pending", text: "Creating V1 invoice…", hash: tx.hash});
        const receipt = await tx.wait();
        const createdLog = receipt.logs
          .map((log) => { try { return manager.interface.parseLog(log); } catch { return null; } })
          .find((log) => log?.name === "InvoiceCreated");
        const createdId = createdLog?.args.invoiceId?.toString();
        if (createdId !== undefined) setInvoiceSearch(createdId);
        setNotice({type: "success", text: `V1 Invoice #${createdId ?? ""} created`, hash: tx.hash});
      }

      await Promise.all([refreshDashboard(account), loadMyInvoices(account)]);
    } catch (error) {
      setNotice({type: "error", text: errorMessage(error)});
    } finally {
      setBusy("");
    }
  };

  const loadInvoice = useCallback(async (event, requestedId = invoiceSearch, targetVersion = appVersion) => {
    event?.preventDefault();
    try {
      setBusy("load");
      if (targetVersion === "v2") {
        if (!INVOICE_MANAGER_V2_ADDRESS) throw new Error("InvoiceManagerV2 address not set");
        const manager = new Contract(INVOICE_MANAGER_V2_ADDRESS, INVOICE_MANAGER_V2_ABI, readProvider);
        const data = await manager.invoices(requestedId);
        if (data.merchant === ZERO_ADDRESS) throw new Error("V2 Invoice does not exist");

        const token = new Contract(data.paymentToken, ERC20_ABI, readProvider);
        const [currentAllowance, sym, dec] = await Promise.all([
          token.allowance(data.payer, INVOICE_MANAGER_V2_ADDRESS).catch(() => 0n),
          token.symbol().catch(() => "TOKEN"),
          token.decimals().catch(() => 18),
        ]);

        const nowSec = Math.floor(Date.now() / 1000);
        const derived = deriveV2InvoiceStatus(data.status, data.dueDate, nowSec);

        setInvoice({
          id: requestedId,
          version: "v2",
          merchant: data.merchant,
          payer: data.payer,
          paymentToken: data.paymentToken,
          tokenSymbol: sym,
          tokenDecimals: Number(dec),
          amount: data.amount,
          dueDate: Number(data.dueDate),
          referenceHash: data.referenceHash,
          statusNum: Number(data.status),
          derivedStatus: derived,
        });
        setAllowance(currentAllowance);
      } else {
        const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, readProvider);
        const token = new Contract(TBT_ADDRESS, ERC20_ABI, readProvider);
        const data = await manager.invoices(requestedId);
        if (data.merchant === ZERO_ADDRESS) throw new Error("V1 Invoice does not exist");
        const currentAllowance = await token.allowance(data.payer, INVOICE_MANAGER_ADDRESS);

        setInvoice({
          id: requestedId,
          version: "v1",
          merchant: data.merchant,
          payer: data.payer,
          paymentToken: TBT_ADDRESS,
          tokenSymbol: "TBT",
          tokenDecimals: 18,
          amount: data.amount,
          dueDate: null,
          referenceHash: null,
          statusNum: Number(data.status),
          derivedStatus: Number(data.status) === 1 ? "Paid" : "Open",
        });
        setAllowance(currentAllowance);
      }
    } catch (error) {
      setInvoice(null);
      setNotice({type: "error", text: errorMessage(error)});
    } finally {
      setBusy("");
    }
  }, [appVersion, invoiceSearch, readProvider]);

  const openInvoice = useCallback(async (invoiceId, ver = "v2", updateHistory = true) => {
    setInvoiceSearch(invoiceId);
    setAppVersion(ver);
    setShowShare(false);
    const path = ver === "v2" ? v2InvoicePath(invoiceId) : invoicePath(invoiceId);
    if (updateHistory) window.history.pushState({}, "", path);
    await loadInvoice(null, invoiceId, ver);
    document.querySelector(".settle-panel")?.scrollIntoView({behavior: "smooth", block: "center"});
  }, [loadInvoice]);

  const copyInvoiceLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice({type: "success", text: "Invoice link copied"});
    } catch {
      setNotice({type: "error", text: "Could not copy link"});
    }
  };

  const approveInvoice = async () => {
    try {
      setBusy("approve");
      const signer = await getSigner();
      const spender = invoice.version === "v2" ? INVOICE_MANAGER_V2_ADDRESS : INVOICE_MANAGER_ADDRESS;
      const token = new Contract(invoice.paymentToken, ERC20_ABI, signer);
      const tx = await token.approve(spender, invoice.amount);
      setNotice({type: "pending", text: `Approving ${invoice.tokenSymbol} allowance…`, hash: tx.hash});
      await tx.wait();
      setNotice({type: "success", text: `${invoice.tokenSymbol} approved`, hash: tx.hash});
      await loadInvoice(null, invoice.id, invoice.version);
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
      if (invoice.version === "v2") {
        const manager = new Contract(INVOICE_MANAGER_V2_ADDRESS, INVOICE_MANAGER_V2_ABI, signer);
        const tx = await manager.payInvoice(invoice.id);
        setNotice({type: "pending", text: `Paying V2 invoice #${invoice.id}…`, hash: tx.hash});
        await tx.wait();
        setNotice({type: "success", text: `V2 Invoice #${invoice.id} paid cleanly`, hash: tx.hash});
      } else {
        const manager = new Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, signer);
        const tx = await manager.payInvoice(invoice.id);
        setNotice({type: "pending", text: `Paying V1 invoice #${invoice.id}…`, hash: tx.hash});
        await tx.wait();
        setNotice({type: "success", text: `V1 Invoice #${invoice.id} paid`, hash: tx.hash});
      }
      await Promise.all([loadInvoice(null, invoice.id, invoice.version), refreshDashboard(account), loadMyInvoices(account)]);
    } catch (error) {
      setNotice({type: "error", text: errorMessage(error)});
    } finally {
      setBusy("");
    }
  };

  const cancelInvoice = async () => {
    try {
      setBusy("cancel");
      const signer = await getSigner();
      const manager = new Contract(INVOICE_MANAGER_V2_ADDRESS, INVOICE_MANAGER_V2_ABI, signer);
      const tx = await manager.cancelInvoice(invoice.id);
      setNotice({type: "pending", text: `Cancelling invoice #${invoice.id}…`, hash: tx.hash});
      await tx.wait();
      setNotice({type: "success", text: `Invoice #${invoice.id} cancelled`, hash: tx.hash});
      await Promise.all([loadInvoice(null, invoice.id, invoice.version), refreshDashboard(account), loadMyInvoices(account)]);
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
    QRCode.toDataURL(shareUrl, {width: 220, margin: 1, color: {dark: "#11130f", light: "#f1f0e9"}})
      .then((value) => { if (active) setQrCode(value); })
      .catch(() => { if (active) setNotice({type: "error", text: "Could not generate QR code"}); });
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
    if (initialV2Id) {
      setAppVersion("v2");
      loadInvoice(null, initialV2Id, "v2");
    } else if (initialV1Id) {
      setAppVersion("v1");
      loadInvoice(null, initialV1Id, "v1");
    }
  }, [initialV1Id, initialV2Id, loadInvoice]);

  useEffect(() => {
    const handleNavigation = () => {
      const v2Id = v2InvoiceIdFromPath(window.location.pathname);
      const v1Id = invoiceIdFromPath(window.location.pathname);
      if (v2Id) openInvoice(v2Id, "v2", false);
      else if (v1Id) openInvoice(v1Id, "v1", false);
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
  const isMerchant = account && invoice && account.toLowerCase() === invoice.merchant.toLowerCase();
  const needsApproval = invoice && allowance < invoice.amount;

  // Receivables metrics
  const dashboardMetrics = useMemo(() => {
    let totalInvoiced = 0n;
    let totalPaid = 0n;
    let totalOutstanding = 0n;
    let overdueCount = 0;

    myInvoices.forEach((item) => {
      totalInvoiced += item.amount;
      if (item.derivedStatus === "Paid") totalPaid += item.amount;
      else if (item.derivedStatus === "Open" || item.derivedStatus === "Overdue") totalOutstanding += item.amount;
      if (item.derivedStatus === "Overdue") overdueCount++;
    });

    return {
      totalInvoiced: formatUnits(totalInvoiced, 18),
      totalPaid: formatUnits(totalPaid, 18),
      totalOutstanding: formatUnits(totalOutstanding, 18),
      overdueCount,
    };
  }, [myInvoices]);

  const filteredInvoices = myInvoices.filter((item) => {
    if (versionFilter === "v2" && item.version !== "v2") return false;
    if (versionFilter === "v1" && item.version !== "v1") return false;

    if (invoiceFilter === "merchant") return item.merchant.toLowerCase() === account.toLowerCase();
    if (invoiceFilter === "payer") return item.payer.toLowerCase() === account.toLowerCase();
    if (invoiceFilter === "open") return item.derivedStatus === "Open";
    if (invoiceFilter === "paid") return item.derivedStatus === "Paid";
    if (invoiceFilter === "cancelled") return item.derivedStatus === "Cancelled";
    if (invoiceFilter === "overdue") return item.derivedStatus === "Overdue";
    return true;
  });

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="Tucker Invoice home">
          <span className="brand-mark">T</span>
          <span>Tucker Invoice <small className="v2-badge">V2 Incubator MVP</small></span>
        </a>
        <div className="nav-actions">
          <span className={`network-pill ${onCorrectChain ? "online" : ""}`}>
            <i /> {onCorrectChain ? "Pharos Atlantic live" : "Wrong network"}
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
          <p className="eyebrow">Cross-border RWA & Stablecoin Payments on Pharos</p>
          <h1>Invoices that move<br /><em>at network speed.</em></h1>
          <p className="hero-copy">Create, track, and receive verifiable cross-border stablecoin payments on Pharos. Zero PII on-chain, instant settlement receipts, and automated expiration.</p>
          <div className="hero-actions">
            {!account ? <button className="primary" onClick={connectWallet}>Connect wallet <span>↗</span></button> : null}
            {account && !onCorrectChain ? <button className="primary" onClick={switchNetwork}>Switch to Atlantic</button> : null}
            <a className="text-link" href={`${EXPLORER_URL}/address/${INVOICE_MANAGER_V2_ADDRESS || INVOICE_MANAGER_ADDRESS}`} target="_blank" rel="noreferrer">View contract ↗</a>
          </div>
        </div>
        <aside className="hero-card">
          <div className="orb"><span>RWA</span></div>
          <p>Pharos Settlement Engine</p>
          <strong>{shortAddress(INVOICE_MANAGER_V2_ADDRESS || INVOICE_MANAGER_ADDRESS)}</strong>
          <div className="hero-card-row"><span>Network</span><b>Pharos Atlantic</b></div>
          <div className="hero-card-row"><span>Protocol</span><b>InvoiceManagerV2</b></div>
          <div className="hero-card-row"><span>Privacy</span><b>Off-chain Ref Hash</b></div>
        </aside>
      </section>

      <section className="stats shell" aria-label="Account overview">
        <div><span>Your TBT balance</span><strong>{maskNetworkData ? "—" : tokenBalance}</strong></div>
        <div><span>Gas balance</span><strong>{maskNetworkData ? "—" : nativeBalance} {!maskNetworkData && <small>PHRS</small>}</strong></div>
        <div><span>Total Invoiced</span><strong>{maskNetworkData ? "—" : `${dashboardMetrics.totalInvoiced} TBT`}</strong></div>
        <div><span>Outstanding</span><strong>{maskNetworkData ? "—" : `${dashboardMetrics.totalOutstanding} TBT`}</strong></div>
      </section>

      <section className="workspace shell">
        <div className="section-heading">
          <div className="heading-with-tabs">
            <div>
              <p className="eyebrow">Protocol Version</p>
              <h2>Workspace & Settle Engine</h2>
            </div>
            <div className="version-tabs" role="tablist">
              <button className={`tab-btn ${appVersion === "v2" ? "active" : ""}`} type="button" onClick={() => setAppVersion("v2")} disabled={!INVOICE_MANAGER_V2_ADDRESS} title={!INVOICE_MANAGER_V2_ADDRESS ? "V2 will be available after its approved testnet deployment" : undefined}>{INVOICE_MANAGER_V2_ADDRESS ? "V2 Incubator MVP" : "V2 deployment pending"}</button>
              <button className={`tab-btn ${appVersion === "v1" ? "active" : ""}`} type="button" onClick={() => setAppVersion("v1")}>V1 Legacy</button>
            </div>
          </div>
        </div>

        {!account || !onCorrectChain ? (
          <div className="gate-card">
            <span>01</span>
            <div><h3>{!account ? "Connect your wallet" : "Switch to Pharos Atlantic"}</h3><p>Connect to create, approve, and settle verifiable stablecoin invoices.</p></div>
            <button className="primary" onClick={!account ? connectWallet : switchNetwork}>{!account ? "Connect MetaMask" : "Switch network"}</button>
          </div>
        ) : (
          <div className="action-grid">
            {/* Merchant Panel */}
            <article className="panel create-panel">
              <div className="panel-number">01</div>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">For merchants ({appVersion.toUpperCase()})</p>
                  <h3>Create {appVersion.toUpperCase()} Invoice</h3>
                </div>
                <span className="icon-box">＋</span>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setShowConfirmationModal(true); }}>
                {appVersion === "v2" ? (
                  <>
                    <label>Payment Token
                      <select value={selectedTokenAddress} onChange={(e) => setSelectedTokenAddress(e.target.value)}>
                        {DEFAULT_V2_TOKENS.map((t) => (
                          <option key={t.address} value={t.address}>{t.symbol} ({t.name})</option>
                        ))}
                      </select>
                    </label>

                    <label>Payer Address
                      <input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="0x…" spellCheck="false" />
                    </label>

                    <label>Amount ({tokenMeta.symbol})
                      <div className="amount-input">
                        <input type="number" min="0.000001" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        <span>{tokenMeta.symbol}</span>
                      </div>
                    </label>

                    <label>Due Date & Expiry
                      <input type="datetime-local" value={dueDateString} onChange={(e) => setDueDateString(e.target.value)} />
                    </label>

                    <label>Non-Sensitive Reference / Order ID
                      <input value={customReference} onChange={(e) => setCustomReference(e.target.value)} placeholder="INV-2026-001" spellCheck="false" />
                      <small className="hint-text">Stored on-chain as 32-byte hash: {shortAddress(textToReferenceHash(customReference))}</small>
                    </label>
                  </>
                ) : (
                  <>
                    <label>Payer address
                      <input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="0x…" spellCheck="false" />
                    </label>
                    <label>Amount
                      <div className="amount-input">
                        <input type="number" min="0.000001" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        <span>TBT</span>
                      </div>
                    </label>
                  </>
                )}

                <button className="primary full" type="submit" disabled={busy === "create"}>
                  {busy === "create" ? "Confirming…" : `Review & Create ${appVersion.toUpperCase()} Invoice`} <span>→</span>
                </button>
              </form>
            </article>

            {/* Payer Settle Panel */}
            <article className="panel settle-panel">
              <div className="panel-number">02</div>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">For payers ({appVersion.toUpperCase()})</p>
                  <h3>Find & Settle Invoice</h3>
                </div>
                <span className="icon-box">↗</span>
              </div>

              <form className="search-form" onSubmit={(e) => loadInvoice(e, invoiceSearch, appVersion)}>
                <label>Invoice ID
                  <div className="search-input">
                    <input type="number" min="0" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
                    <button disabled={busy === "load"}>Find</button>
                  </div>
                </label>
              </form>

              {invoice ? (
                <div className="invoice-card">
                  <div className="invoice-top">
                    <span>{invoice.version.toUpperCase()} Invoice #{invoice.id}</span>
                    <b className={`status-tag ${invoice.derivedStatus.toLowerCase()}`}>
                      {invoice.derivedStatus}
                    </b>
                  </div>

                  <strong className="invoice-amount">
                    {formatUnits(invoice.amount, invoice.tokenDecimals)} <small>{invoice.tokenSymbol}</small>
                  </strong>

                  <dl>
                    <div><dt>Merchant</dt><dd title={invoice.merchant}>{shortAddress(invoice.merchant)}</dd></div>
                    <div><dt>Payer</dt><dd title={invoice.payer}>{shortAddress(invoice.payer)}</dd></div>
                    {invoice.version === "v2" ? (
                      <>
                        <div><dt>Payment Token</dt><dd title={invoice.paymentToken}>{invoice.tokenSymbol} ({shortAddress(invoice.paymentToken)})</dd></div>
                        <div><dt>Due Date</dt><dd>{new Date(invoice.dueDate * 1000).toLocaleString()}</dd></div>
                        <div><dt>Reference Hash</dt><dd title={invoice.referenceHash}>{shortAddress(invoice.referenceHash)}</dd></div>
                      </>
                    ) : null}
                  </dl>

                  <div className="share-actions">
                    <button className="tertiary" type="button" onClick={copyInvoiceLink}>Copy link</button>
                    <button className="tertiary" type="button" onClick={() => setShowShare((v) => !v)}>{showShare ? "Hide QR" : "Show QR"}</button>
                    <button className="tertiary" type="button" onClick={() => setShowReceipt(true)}>View Receipt</button>
                  </div>

                  {showShare ? (
                    <div className="share-card">
                      {qrCode ? <img src={qrCode} alt={`QR code for invoice ${invoice.id}`} /> : <span>Creating QR…</span>}
                      <div><strong>Scan to open invoice #{invoice.id}</strong><p>{shareUrl}</p></div>
                    </div>
                  ) : null}

                  {invoice.derivedStatus === "Open" && isPayer ? (
                    needsApproval ? (
                      <button className="secondary full" onClick={approveInvoice} disabled={busy === "approve"}>
                        {busy === "approve" ? "Approving…" : `Approve ${formatUnits(invoice.amount, invoice.tokenDecimals)} ${invoice.tokenSymbol}`}
                      </button>
                    ) : (
                      <button className="primary full" onClick={payInvoice} disabled={busy === "pay"}>
                        {busy === "pay" ? "Paying…" : `Pay Invoice (${formatUnits(invoice.amount, invoice.tokenDecimals)} ${invoice.tokenSymbol})`} <span>→</span>
                      </button>
                    )
                  ) : null}

                  {invoice.version === "v2" && invoice.derivedStatus === "Open" && isMerchant ? (
                    <button className="danger-btn full" onClick={cancelInvoice} disabled={busy === "cancel"}>
                      {busy === "cancel" ? "Cancelling…" : "Cancel Invoice"}
                    </button>
                  ) : null}

                  {invoice.derivedStatus === "Overdue" ? (
                    <p className="warning-hint">This invoice has expired past its due date and cannot be settled.</p>
                  ) : invoice.derivedStatus === "Cancelled" ? (
                    <p className="warning-hint">This invoice was cancelled by the merchant.</p>
                  ) : invoice.derivedStatus === "Open" && !isPayer ? (
                    <p className="hint">Connect the designated payer wallet to settle this invoice.</p>
                  ) : null}
                </div>
              ) : (
                <p className="empty-state">Enter an invoice ID to review its status, amount, and payer details.</p>
              )}
            </article>
          </div>
        )}

        {/* Receivables & On-Chain Dashboard */}
        {account && onCorrectChain ? (
          <section className="invoice-library" aria-labelledby="my-invoices-title">
            <div className="library-header">
              <div>
                <p className="eyebrow">Receivables & Settlement Activity</p>
                <h3 id="my-invoices-title">On-chain Invoice Ledger</h3>
              </div>
              <button className="secondary compact" type="button" onClick={() => loadMyInvoices(account)} disabled={myInvoicesBusy}>
                {myInvoicesBusy ? "Refreshing…" : "Refresh Ledger"}
              </button>
            </div>

            <div className="filter-tab-bar">
              <div className="filter-tabs" role="group" aria-label="Filter role">
                {[["all", "All Roles"], ["merchant", "Created by me"], ["payer", "Payable by me"]].map(([val, label]) => (
                  <button key={val} className={invoiceFilter === val ? "active" : ""} type="button" onClick={() => setInvoiceFilter(val)}>{label}</button>
                ))}
              </div>
              <div className="filter-tabs" role="group" aria-label="Filter status">
                {[["all", "All Statuses"], ["open", "Open"], ["paid", "Paid"], ["overdue", "Overdue"], ["cancelled", "Cancelled"]].map(([val, label]) => (
                  <button key={val} className={invoiceFilter === val ? "active" : ""} type="button" onClick={() => setInvoiceFilter(val)}>{label}</button>
                ))}
              </div>
              <div className="filter-tabs" role="group" aria-label="Filter version">
                {[["all", "V1 + V2"], ["v2", "V2 Only"], ["v1", "V1 Only"]].map(([val, label]) => (
                  <button key={val} className={versionFilter === val ? "active" : ""} type="button" onClick={() => setVersionFilter(val)}>{label}</button>
                ))}
              </div>
            </div>

            {myInvoicesError ? <p className="library-message error-text">Could not load invoices: {myInvoicesError}</p> : null}
            {!myInvoicesError && !myInvoicesBusy && filteredInvoices.length === 0 ? <p className="library-message">No invoices match this filter yet.</p> : null}

            <div className="invoice-list">
              {filteredInvoices.map((item) => (
                <button key={`${item.version}-${item.id}`} className="invoice-row" type="button" onClick={() => openInvoice(item.id, item.version)}>
                  <span><small>{item.version.toUpperCase()} Invoice</small>#{item.id}</span>
                  <span><small>Amount</small>{formatUnits(item.amount, item.tokenDecimals)} {item.tokenSymbol}</span>
                  <span><small>Role</small>{item.merchant.toLowerCase() === account.toLowerCase() ? "Merchant" : "Payer"}</span>
                  <b className={`status-tag ${item.derivedStatus.toLowerCase()}`}>{item.derivedStatus}</b>
                  <i>↗</i>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      {/* Confirmation Modal */}
      {showConfirmationModal ? (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Confirm {appVersion.toUpperCase()} Invoice Creation</h3>
            <p>Please review invoice parameters before submitting on-chain:</p>
            <dl className="modal-dl">
              <div><dt>Protocol Version</dt><dd>{appVersion.toUpperCase()}</dd></div>
              <div><dt>Payer Address</dt><dd>{payer}</dd></div>
              <div><dt>Amount</dt><dd>{amount} {tokenMeta.symbol}</dd></div>
              {appVersion === "v2" ? (
                <>
                  <div><dt>Payment Token</dt><dd>{tokenMeta.symbol} ({shortAddress(selectedTokenAddress)})</dd></div>
                  <div><dt>Due Date</dt><dd>{new Date(dueDateString).toLocaleString()}</dd></div>
                  <div><dt>Reference</dt><dd>{customReference}</dd></div>
                  <div><dt>On-chain Reference Hash</dt><dd>{shortAddress(textToReferenceHash(customReference))}</dd></div>
                </>
              ) : null}
            </dl>
            <div className="modal-actions">
              <button className="tertiary" type="button" onClick={() => setShowConfirmationModal(false)}>Cancel</button>
              <button className="primary" type="button" onClick={submitCreateInvoice}>Confirm & Submit ↗</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Printable Receipt Modal */}
      {showReceipt && invoice ? (
        <div className="modal-backdrop printable-modal">
          <div className="modal-content receipt-card printable-area">
            <div className="receipt-header">
              <div>
                <h2>Settlement Receipt</h2>
                <p>Verifiable On-Chain Payment Record</p>
              </div>
              <span className="v2-badge">{invoice.version.toUpperCase()}</span>
            </div>

            <div className="receipt-body">
              <div className="receipt-row"><span>Invoice ID</span><strong>#{invoice.id}</strong></div>
              <div className="receipt-row"><span>Status</span><strong className={invoice.derivedStatus.toLowerCase()}>{invoice.derivedStatus}</strong></div>
              <div className="receipt-row"><span>Amount</span><strong>{formatUnits(invoice.amount, invoice.tokenDecimals)} {invoice.tokenSymbol}</strong></div>
              <div className="receipt-row"><span>Merchant</span><code>{invoice.merchant}</code></div>
              <div className="receipt-row"><span>Payer</span><code>{invoice.payer}</code></div>
              {invoice.version === "v2" ? (
                <>
                  <div className="receipt-row"><span>Payment Token</span><code>{invoice.paymentToken}</code></div>
                  <div className="receipt-row"><span>Due Date</span><strong>{new Date(invoice.dueDate * 1000).toLocaleString()}</strong></div>
                  <div className="receipt-row"><span>Reference Hash</span><code>{invoice.referenceHash}</code></div>
                </>
              ) : null}
              <div className="receipt-row"><span>Network</span><strong>Pharos Atlantic Testnet (Chain ID 688689)</strong></div>
            </div>

            <p className="disclaimer-text">
              Payment Receipt for Verifiable On-Chain Settlement. This on-chain settlement receipt is not a regulated tax invoice.
            </p>

            <div className="modal-actions no-print">
              <button className="secondary" type="button" onClick={() => window.print()}>Print Receipt 🖨</button>
              <button className="primary" type="button" onClick={() => setShowReceipt(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="shell">
        <span>Built for Pharos Incubator Track — RWA & Stablecoin Payments</span>
        <a href={`${EXPLORER_URL}/address/${INVOICE_MANAGER_V2_ADDRESS || INVOICE_MANAGER_ADDRESS}`} target="_blank" rel="noreferrer">Explorer ↗</a>
      </footer>

      {notice ? (
        <div className={`toast ${notice.type}`} role="status">
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
          <span>{notice.type === "pending" ? "◌" : notice.type === "success" ? "✓" : "!"}</span>
          <div>
            <strong>{notice.type === "error" ? "Action failed" : notice.type === "pending" ? "Transaction pending" : "All set"}</strong>
            <p>{notice.text}</p>
            {notice.hash ? <a href={`${EXPLORER_URL}/tx/${notice.hash}`} target="_blank" rel="noreferrer">View transaction ↗</a> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
