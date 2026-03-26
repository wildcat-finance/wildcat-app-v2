"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
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
  borderRadius: "24px",
  border: `1px solid ${COLORS.blackRock006}`,
  boxShadow: "none",
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

  return (
    <Box
      sx={{
        width: "100%",
        px: { xs: 2, md: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={3} maxWidth="920px">
        <Box>
          <Chip
            label="Preview Deploy Tool"
            sx={{
              mb: 2,
              backgroundColor: COLORS.blueRibbon01,
              color: COLORS.ultramarineBlue,
              fontWeight: 600,
            }}
          />
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            Deploy Wildcat4626WrapperFactory
          </Typography>
          <Typography variant="text2" color={COLORS.manate}>
            This page deploys the compiled{" "}
            <strong>{WILDCAT_4626_FACTORY_CONTRACT_NAME}</strong> contract from
            the connected wallet and produces a downloadable artifact bundle
            when the deployment succeeds.
          </Typography>
        </Box>

        <Paper sx={{ ...cardSx, p: 3 }}>
          <Stack spacing={2.5}>
            <Typography variant="title3">Deployment setup</Typography>

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
            >
              {targetOptions.map((option) => (
                <MenuItem key={option.chainId} value={option.chainId}>
                  {option.chainName}
                </MenuItem>
              ))}
            </TextField>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              divider={<Divider flexItem orientation="vertical" />}
            >
              <Box flex={1}>
                <Typography variant="text4" color={COLORS.manate}>
                  Connected wallet
                </Typography>
                <Typography variant="text1" sx={{ mt: 0.5 }}>
                  {address ? trimAddress(address, 8) : "No wallet connected"}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="text4" color={COLORS.manate}>
                  Wallet network
                </Typography>
                <Typography variant="text1" sx={{ mt: 0.5 }}>
                  {connectedNetworkLabel}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="text4" color={COLORS.manate}>
                  Arch controller
                </Typography>
                <Typography variant="text1" sx={{ mt: 0.5 }}>
                  {trimAddress(target.archController, 10)}
                </Typography>
              </Box>
            </Stack>

            <Alert
              severity={isOnTargetChain || !isConnected ? "info" : "warning"}
              sx={{ borderRadius: "16px" }}
            >
              {isConnected && !isOnTargetChain
                ? `The wallet is connected to ${connectedNetworkLabel}. Switch to ${target.chainName} before deploying.`
                : `The deployment will use ${target.chainName} and pass ${target.archController} to the constructor.`}
            </Alert>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {!isConnected && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setIsConnectDialogOpen(true)}
                >
                  Connect wallet
                </Button>
              )}

              {isConnected && !isOnTargetChain && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSwitchNetwork}
                  disabled={isSwitchingNetwork}
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
              >
                {isDeploying ? "Deploying..." : `Deploy to ${target.chainName}`}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {(isDeploying || pendingTxHash || deployError || deploymentResult) && (
          <Paper sx={{ ...cardSx, p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="title3">Deployment status</Typography>

              {isDeploying && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={20} />
                  <Typography variant="text2">
                    Waiting for the deployment transaction to confirm on{" "}
                    {target.chainName}.
                  </Typography>
                </Stack>
              )}

              {pendingTxHash && (
                <Typography variant="text2">
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

              {deployError && <Alert severity="error">{deployError}</Alert>}

              {deploymentResult && (
                <Stack spacing={1.5}>
                  <Alert severity="success" sx={{ borderRadius: "16px" }}>
                    Deployment confirmed. The artifact bundle should start
                    downloading automatically.
                  </Alert>

                  <Typography variant="text2">
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

                  <Typography variant="text2">
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

                  <Typography variant="text2">
                    Confirmed at{" "}
                    {formatIsoTimestamp(deploymentResult.deployedAt)}
                  </Typography>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleDownloadArtifacts}
                      disabled={isPreparingDownload}
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
                    >
                      Clear status
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        <Paper sx={{ ...cardSx, p: 3, backgroundColor: COLORS.blackHaze }}>
          <Stack spacing={1}>
            <Typography variant="title3">Included artifacts</Typography>
            <Typography variant="text2" color={COLORS.manate}>
              The downloaded zip contains `deployment.json`, the ABI, and a
              compact local artifact with the exact bytecode and metadata used
              by this page.
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
