"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  SvgIcon,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { ContractFactory, utils } from "ethers"
import JSZip from "jszip"
import { useAccount, useSwitchChain } from "wagmi"

import { ConnectWalletDialog } from "@/components/Header/HeaderButton/ConnectWalletDialog"
import { toastError, toastInfo, toastSuccess } from "@/components/Toasts"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import {
  Supported4626DeploymentChainId,
  WILDCAT_4626_DEPLOYMENT_TARGETS,
  WILDCAT_4626_FACTORY_ABI,
  WILDCAT_4626_FACTORY_BYTECODE,
  WILDCAT_4626_FACTORY_COMPILER_VERSION,
  WILDCAT_4626_FACTORY_CONTRACT_NAME,
  WILDCAT_4626_FACTORY_SOURCE_HASH,
  WILDCAT_4626_FACTORY_SOURCE_PATH,
} from "./factoryArtifact"

function CopyIcon() {
  return (
    <SvgIcon sx={{ fontSize: "inherit" }}>
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </SvgIcon>
  )
}

type DeploymentResult = {
  archController: string
  chainId: Supported4626DeploymentChainId
  chainName: string
  deployedAddress: string
  deployedAt: string
  deployer: string
  explorerUrl: string
  constructorArgsEncoded: string
  transactionHash: string
  blockHash: string
  blockNumber: number
  gasUsed: string
  effectiveGasPrice: string | null
}

const DEFAULT_TARGET_CHAIN_ID: Supported4626DeploymentChainId = 11155111

const cardSx = {
  borderRadius: "16px",
  border: `1px solid ${COLORS.blackRock006}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
}

const kvLabelSx = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: COLORS.manate,
  mb: 0.5,
}

const kvValueSx = {
  fontSize: "14px",
  fontWeight: 500,
  fontFamily: "monospace",
}

const triggerDownload = (url: string, filename: string) => {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

const buildExplorerLink = (
  baseUrl: string,
  type: "tx" | "address",
  value: string,
) => `${baseUrl}/${type}/${value}`

const formatIsoTimestamp = (value: string) =>
  new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value))

export default function Deploy4626FactoryPage() {
  const [targetChainId, setTargetChainId] =
    useState<Supported4626DeploymentChainId>(DEFAULT_TARGET_CHAIN_ID)
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null)
  const [deploymentResult, setDeploymentResult] =
    useState<DeploymentResult | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null)
  const [isPreparingDownload, setIsPreparingDownload] = useState(false)

  const downloadPreparedFor = useRef<string | null>(null)

  const {
    address,
    chain,
    chainId: connectedChainId,
    isConnected,
  } = useAccount()
  const signer = useEthersSigner({ chainId: targetChainId })
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain()

  const target = WILDCAT_4626_DEPLOYMENT_TARGETS[targetChainId]
  const isOnTargetChain = connectedChainId === targetChainId

  const targetOptions = useMemo(
    () =>
      Object.values(WILDCAT_4626_DEPLOYMENT_TARGETS).sort(
        (left, right) => left.chainId - right.chainId,
      ),
    [],
  )

  const connectedNetworkLabel = chain?.name ?? "Not connected"

  useEffect(() => {
    if (!downloadUrl) {
      return undefined
    }

    return () => {
      URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  useEffect(() => {
    if (!deploymentResult) {
      return undefined
    }

    if (downloadPreparedFor.current === deploymentResult.transactionHash) {
      return undefined
    }

    let isCancelled = false

    const prepareArtifacts = async () => {
      setIsPreparingDownload(true)

      const deploymentPayload = {
        contractName: WILDCAT_4626_FACTORY_CONTRACT_NAME,
        sourcePath: WILDCAT_4626_FACTORY_SOURCE_PATH,
        sourceHash: WILDCAT_4626_FACTORY_SOURCE_HASH,
        compilerVersion: WILDCAT_4626_FACTORY_COMPILER_VERSION,
        network: {
          chainId: deploymentResult.chainId,
          name: deploymentResult.chainName,
          explorerUrl: deploymentResult.explorerUrl,
        },
        constructor: {
          archController: deploymentResult.archController,
          args: [deploymentResult.archController],
          encoded: deploymentResult.constructorArgsEncoded,
        },
        deployment: {
          address: deploymentResult.deployedAddress,
          deployer: deploymentResult.deployer,
          transactionHash: deploymentResult.transactionHash,
          blockHash: deploymentResult.blockHash,
          blockNumber: deploymentResult.blockNumber,
          gasUsed: deploymentResult.gasUsed,
          effectiveGasPrice: deploymentResult.effectiveGasPrice,
          deployedAt: deploymentResult.deployedAt,
          transactionUrl: buildExplorerLink(
            deploymentResult.explorerUrl,
            "tx",
            deploymentResult.transactionHash,
          ),
          addressUrl: buildExplorerLink(
            deploymentResult.explorerUrl,
            "address",
            deploymentResult.deployedAddress,
          ),
        },
      }

      const contractArtifact = {
        contractName: WILDCAT_4626_FACTORY_CONTRACT_NAME,
        sourcePath: WILDCAT_4626_FACTORY_SOURCE_PATH,
        sourceHash: WILDCAT_4626_FACTORY_SOURCE_HASH,
        compilerVersion: WILDCAT_4626_FACTORY_COMPILER_VERSION,
        abi: WILDCAT_4626_FACTORY_ABI,
        bytecode: WILDCAT_4626_FACTORY_BYTECODE,
      }

      const zip = new JSZip()
      zip.file("deployment.json", JSON.stringify(deploymentPayload, null, 2))
      zip.file(
        `${WILDCAT_4626_FACTORY_CONTRACT_NAME}.abi.json`,
        JSON.stringify(WILDCAT_4626_FACTORY_ABI, null, 2),
      )
      zip.file(
        `${WILDCAT_4626_FACTORY_CONTRACT_NAME}.artifact.json`,
        JSON.stringify(contractArtifact, null, 2),
      )
      zip.file(
        "README.txt",
        [
          `${WILDCAT_4626_FACTORY_CONTRACT_NAME} deployment artifact bundle`,
          "",
          `Deployed address: ${deploymentResult.deployedAddress}`,
          `Transaction hash: ${deploymentResult.transactionHash}`,
          `Network: ${deploymentResult.chainName} (${deploymentResult.chainId})`,
          `Arch controller: ${deploymentResult.archController}`,
        ].join("\n"),
      )

      const blob = await zip.generateAsync({ type: "blob" })

      if (isCancelled) {
        return
      }

      const nextFilename = `${[
        "wildcat4626-wrapper-factory",
        target.slug,
        deploymentResult.deployedAddress.toLowerCase(),
      ].join("-")}.zip`

      const nextUrl = URL.createObjectURL(blob)
      downloadPreparedFor.current = deploymentResult.transactionHash

      setDownloadUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }
        return nextUrl
      })
      setDownloadFilename(nextFilename)
      setIsPreparingDownload(false)

      triggerDownload(nextUrl, nextFilename)
      toastSuccess("Deployment artifacts download started.")
    }

    prepareArtifacts().catch((error: unknown) => {
      setIsPreparingDownload(false)
      const message =
        error instanceof Error
          ? error.message
          : "Failed to prepare deployment artifacts."
      toastError(message)
    })

    return () => {
      isCancelled = true
    }
  }, [deploymentResult, target.slug])

  const handleDownloadArtifacts = () => {
    if (!downloadUrl || !downloadFilename) {
      toastInfo("Artifacts are still being prepared.")
      return
    }

    triggerDownload(downloadUrl, downloadFilename)
  }

  const handleSwitchNetwork = async () => {
    if (!switchChainAsync) {
      toastError("Wallet does not support programmatic network switching.")
      return
    }

    try {
      await switchChainAsync({ chainId: targetChainId })
      toastSuccess(`Switched to ${target.chainName}.`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to switch network."
      toastError(message)
    }
  }

  const handleDeploy = async () => {
    setDeployError(null)
    setDeploymentResult(null)
    setPendingTxHash(null)

    if (!isConnected || !address) {
      setDeployError("Connect a wallet before deploying.")
      setIsConnectDialogOpen(true)
      return
    }

    if (!isOnTargetChain) {
      setDeployError(`Switch the connected wallet to ${target.chainName}.`)
      return
    }

    if (!signer) {
      setDeployError("Wallet signer is not ready yet. Try again in a moment.")
      return
    }

    setIsDeploying(true)

    try {
      const factory = new ContractFactory(
        WILDCAT_4626_FACTORY_ABI,
        WILDCAT_4626_FACTORY_BYTECODE,
        signer,
      )

      const contract = await factory.deploy(target.archController)
      setPendingTxHash(contract.deployTransaction.hash)

      const receipt = await contract.deployTransaction.wait()
      const deployedArchController = await contract.archController()

      if (
        deployedArchController.toLowerCase() !==
        target.archController.toLowerCase()
      ) {
        throw new Error(
          "Deployed contract returned an unexpected arch controller.",
        )
      }

      const constructorArgsEncoded = utils.defaultAbiCoder.encode(
        ["address"],
        [target.archController],
      )

      setDeploymentResult({
        archController: target.archController,
        chainId: target.chainId,
        chainName: target.chainName,
        deployedAddress: contract.address,
        deployedAt: new Date().toISOString(),
        deployer: address,
        explorerUrl: target.explorerUrl,
        constructorArgsEncoded,
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice
          ? receipt.effectiveGasPrice.toString()
          : null,
      })

      toastSuccess(
        `${WILDCAT_4626_FACTORY_CONTRACT_NAME} deployed successfully.`,
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Deployment failed."
      setDeployError(message)
      toastError(message)
    } finally {
      setIsDeploying(false)
    }
  }

  const [copiedArchController, setCopiedArchController] = useState(false)
  const [copiedWallet, setCopiedWallet] = useState(false)

  const handleCopyArchController = () => {
    navigator.clipboard.writeText(target.archController)
    setCopiedArchController(true)
    setTimeout(() => setCopiedArchController(false), 2000)
  }

  const handleCopyWallet = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopiedWallet(true)
    setTimeout(() => setCopiedWallet(false), 2000)
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: "680px" }}>
        {/* Header */}
        <Box>
          <Typography
            sx={{
              fontSize: "12px",
              fontWeight: 600,
              color: COLORS.ultramarineBlue,
              letterSpacing: "0.04em",
              mb: 1,
            }}
          >
            Preview Deploy Tool
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}
          >
            Deploy Wildcat4626WrapperFactory
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: COLORS.manate, lineHeight: 1.6 }}
          >
            This page deploys the compiled{" "}
            <strong style={{ color: COLORS.blackRock }}>
              {WILDCAT_4626_FACTORY_CONTRACT_NAME}
            </strong>{" "}
            contract from the connected wallet and produces a downloadable
            artifact bundle when the deployment succeeds.
          </Typography>
        </Box>

        {/* Deployment setup card */}
        <Paper sx={{ ...cardSx, p: { xs: 2.5, md: 3.5 } }}>
          <Stack spacing={3}>
            <Typography sx={{ fontSize: "16px", fontWeight: 700 }}>
              Deployment setup
            </Typography>

            <TextField
              select
              label="Target chain"
              value={targetChainId}
              onChange={(event) =>
                setTargetChainId(
                  Number(event.target.value) as Supported4626DeploymentChainId,
                )
              }
              fullWidth
              size="small"
            >
              {targetOptions.map((option) => (
                <MenuItem key={option.chainId} value={option.chainId}>
                  {option.chainName}
                </MenuItem>
              ))}
            </TextField>

            {/* Key-value grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                gap: 2,
                p: 2,
                borderRadius: "12px",
                backgroundColor: COLORS.blackHaze,
              }}
            >
              <Box>
                <Typography sx={kvLabelSx}>Connected wallet</Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography sx={kvValueSx}>
                    {address ? trimAddress(address, 8) : "No wallet connected"}
                  </Typography>
                  {address && (
                    <Tooltip title={copiedWallet ? "Copied!" : "Copy address"}>
                      <IconButton
                        size="small"
                        onClick={handleCopyWallet}
                        sx={{
                          p: 0.25,
                          color: COLORS.manate,
                          "&:hover": { color: COLORS.blackRock },
                        }}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
              <Box>
                <Typography sx={kvLabelSx}>Wallet network</Typography>
                <Typography sx={kvValueSx}>{connectedNetworkLabel}</Typography>
              </Box>
              <Box>
                <Typography sx={kvLabelSx}>Arch controller</Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography sx={kvValueSx}>
                    {trimAddress(target.archController, 10)}
                  </Typography>
                  <Tooltip
                    title={copiedArchController ? "Copied!" : "Copy address"}
                  >
                    <IconButton
                      size="small"
                      onClick={handleCopyArchController}
                      sx={{
                        p: 0.25,
                        color: COLORS.manate,
                        "&:hover": { color: COLORS.blackRock },
                      }}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </Box>

            {/* Info/warning alert - toned down */}
            <Alert
              severity={isOnTargetChain || !isConnected ? "info" : "warning"}
              sx={{
                borderRadius: "12px",
                fontSize: "13px",
                "& .MuiAlert-message": { fontSize: "13px" },
              }}
            >
              {isConnected && !isOnTargetChain
                ? `The wallet is connected to ${connectedNetworkLabel}. Switch to ${target.chainName} before deploying.`
                : `The deployment will use ${target.chainName} and pass ${target.archController} to the constructor.`}
            </Alert>

            {/* Action buttons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {!isConnected && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => setIsConnectDialogOpen(true)}
                  sx={{ px: 3 }}
                >
                  Connect wallet
                </Button>
              )}

              {isConnected && !isOnTargetChain && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleSwitchNetwork}
                  disabled={isSwitchingNetwork}
                  sx={{ px: 3 }}
                >
                  {isSwitchingNetwork
                    ? "Switching..."
                    : `Switch to ${target.chainName}`}
                </Button>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={handleDeploy}
                disabled={
                  isDeploying ||
                  isPreparingDownload ||
                  !isConnected ||
                  !isOnTargetChain
                }
                sx={{
                  px: 4,
                  py: 1.25,
                  fontWeight: 700,
                  fontSize: "15px",
                  flex: { xs: "unset", sm: 1 },
                }}
              >
                {isDeploying ? "Deploying..." : `Deploy to ${target.chainName}`}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Deployment status card */}
        {(isDeploying || pendingTxHash || deployError || deploymentResult) && (
          <Paper sx={{ ...cardSx, p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={2}>
              <Typography sx={{ fontSize: "16px", fontWeight: 700 }}>
                Deployment status
              </Typography>

              {isDeploying && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" sx={{ color: COLORS.manate }}>
                    Waiting for the deployment transaction to confirm on{" "}
                    {target.chainName}.
                  </Typography>
                </Stack>
              )}

              {pendingTxHash && (
                <Typography variant="body2">
                  Pending transaction:{" "}
                  <Link
                    href={buildExplorerLink(
                      target.explorerUrl,
                      "tx",
                      pendingTxHash,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {trimAddress(pendingTxHash, 12)}
                  </Link>
                </Typography>
              )}

              {deployError && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: "12px",
                    "& .MuiAlert-message": {
                      overflow: "auto",
                      maxHeight: "200px",
                      wordBreak: "break-word",
                    },
                  }}
                >
                  {deployError}
                </Alert>
              )}

              {deploymentResult && (
                <Stack spacing={1.5}>
                  <Alert severity="success" sx={{ borderRadius: "12px" }}>
                    Deployment confirmed. The artifact bundle should start
                    downloading automatically.
                  </Alert>

                  <Typography variant="body2">
                    Contract address:{" "}
                    <Link
                      href={buildExplorerLink(
                        deploymentResult.explorerUrl,
                        "address",
                        deploymentResult.deployedAddress,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {deploymentResult.deployedAddress}
                    </Link>
                  </Typography>

                  <Typography variant="body2">
                    Transaction:{" "}
                    <Link
                      href={buildExplorerLink(
                        deploymentResult.explorerUrl,
                        "tx",
                        deploymentResult.transactionHash,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {deploymentResult.transactionHash}
                    </Link>
                  </Typography>

                  <Typography variant="body2">
                    Confirmed at{" "}
                    {formatIsoTimestamp(deploymentResult.deployedAt)}
                  </Typography>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleDownloadArtifacts}
                      disabled={isPreparingDownload}
                      sx={{ px: 3 }}
                    >
                      {isPreparingDownload
                        ? "Preparing artifacts..."
                        : "Download artifacts"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setDeployError(null)
                        setPendingTxHash(null)
                      }}
                      sx={{ px: 3 }}
                    >
                      Clear status
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        {/* Included artifacts card */}
        <Paper
          sx={{
            ...cardSx,
            p: { xs: 2.5, md: 3.5 },
            backgroundColor: COLORS.blackHaze,
            border: "none",
          }}
        >
          <Stack spacing={1}>
            <Typography sx={{ fontSize: "14px", fontWeight: 700 }}>
              Included artifacts
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: COLORS.manate, lineHeight: 1.6 }}
            >
              The downloaded zip contains{" "}
              <code
                style={{
                  fontSize: "12px",
                  backgroundColor: COLORS.whiteLilac,
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                deployment.json
              </code>
              , the ABI, and a compact local artifact with the exact bytecode
              and metadata used by this page.
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      <ConnectWalletDialog
        open={isConnectDialogOpen}
        handleClose={() => setIsConnectDialogOpen(false)}
      />
    </Box>
  )
}
