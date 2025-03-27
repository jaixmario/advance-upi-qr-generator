"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Download, RefreshCw, Moon, Sun, Share2, Save, History, Copy, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

// Define the saved QR code type
type SavedQR = {
  id: string
  upiId: string
  amount: string
  payeeName: string
  note: string
  timestamp: number
  qrValue: string
  isDynamic: boolean
}

export default function ClientPage() {
  const [upiId, setUpiId] = useState("")
  const [amount, setAmount] = useState("")
  const [isValidAmount, setIsValidAmount] = useState(true)
  const [payeeName, setPayeeName] = useState("")
  const [transactionNote, setTransactionNote] = useState("")
  const [qrValue, setQrValue] = useState("")
  const [activeTab, setActiveTab] = useState("static")
  const [qrCodeSrc, setQrCodeSrc] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [savedQRs, setSavedQRs] = useState<SavedQR[]>([])
  const [qrColor, setQrColor] = useState("000000")
  const [bgColor, setBgColor] = useState("FFFFFF")
  const [showCustomization, setShowCustomization] = useState(false)
  const [isValidUpiId, setIsValidUpiId] = useState(true)
  const [isUpiIdTouched, setIsUpiIdTouched] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme, resolvedTheme } = useTheme()

  // Set isClient to true when component mounts and load saved QRs
  useEffect(() => {
    setIsClient(true)
    setMounted(true)

    // Load saved QRs from localStorage
    if (typeof window !== "undefined") {
      const savedQRsString = localStorage.getItem("savedUpiQRs")
      if (savedQRsString) {
        try {
          const parsed = JSON.parse(savedQRsString)
          setSavedQRs(parsed)
        } catch (e) {
          console.error("Failed to parse saved QRs", e)
        }
      }
    }
  }, [])

  // Validate UPI ID format
  const validateUpiId = (id: string) => {
    if (!id) return false
    // Basic UPI ID validation - username@provider format
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/
    return upiRegex.test(id)
  }

  // Handle UPI ID change with validation
  const handleUpiIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUpiId(value)
    setIsUpiIdTouched(true)
    setIsValidUpiId(value === "" || validateUpiId(value))
  }

  // Handle amount change with validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Don't allow negative values
    if (value.startsWith("-")) {
      setIsValidAmount(false)
      toast({
        title: "Invalid Amount",
        description: "Amount cannot be negative",
        variant: "destructive",
      })
      return
    }

    setAmount(value)
    setIsValidAmount(true)
  }

  // Generate UPI URL with customization options
  const generateUpiUrl = () => {
    if (!upiId) {
      toast({
        title: "UPI ID Required",
        description: "Please enter a valid UPI ID",
        variant: "destructive",
      })
      return
    }

    if (!isValidUpiId) {
      toast({
        title: "Invalid UPI ID Format",
        description: "Please enter a valid UPI ID in the format username@provider",
        variant: "destructive",
      })
      return
    }

    if (activeTab === "dynamic" && amount) {
      const amountNum = Number.parseFloat(amount)
      if (amountNum <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a positive amount",
          variant: "destructive",
        })
        return
      }
    }

    let url = `upi://pay?pa=${encodeURIComponent(upiId)}`

    if (payeeName) {
      url += `&pn=${encodeURIComponent(payeeName)}`
    }

    if (amount && activeTab === "dynamic") {
      url += `&am=${encodeURIComponent(amount)}`
    }

    if (transactionNote) {
      url += `&tn=${encodeURIComponent(transactionNote)}`
    }

    // Add current timestamp to make each QR unique for tracking
    const timestamp = Date.now()
    url += `&tr=${timestamp}`

    // Add mode and purpose
    url += "&cu=INR&mode=01&purpose=00"

    setQrValue(url)

    // Use QR Server API with color customization
    const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&color=${qrColor}&bgcolor=${bgColor}`
    setQrCodeSrc(qrServerUrl)

    // Show success toast
    toast({
      title: "QR Code Generated",
      description: "Your UPI QR code has been generated successfully",
    })
  }

  // Download QR code as image
  const downloadQR = async () => {
    if (!qrCodeSrc) {
      toast({
        title: "Generate QR First",
        description: "Please generate a QR code before downloading",
        variant: "destructive",
      })
      return
    }

    try {
      setIsDownloading(true)

      // Create a sanitized filename from the UPI ID
      // Replace special characters that aren't allowed in filenames
      const sanitizedUpiId = upiId.replace(/[/\\?%*:|"<>]/g, "-")

      // Create a descriptive filename with the UPI ID as the main part
      const filename = `UPI-${sanitizedUpiId}${amount ? `-Rs${amount}` : ""}.png`

      // Fetch the image from the external URL
      const response = await fetch(qrCodeSrc)

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()

      // Create a local URL for the blob
      const blobUrl = URL.createObjectURL(blob)

      // Create and trigger the download
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

      toast({
        title: "QR Code Downloaded",
        description: `Saved as "${filename}"`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download Failed",
        description: "There was an error downloading the QR code",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Share QR code
  const shareQR = async () => {
    if (!qrCodeSrc) {
      toast({
        title: "Generate QR First",
        description: "Please generate a QR code before sharing",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if Web Share API is available
      if (navigator.share) {
        // Fetch the image and convert to blob for sharing
        const response = await fetch(qrCodeSrc)
        const blob = await response.blob()
        const file = new File([blob], `UPI-${upiId}.png`, { type: "image/png" })

        await navigator.share({
          title: `UPI Payment QR for ${upiId}`,
          text: `Scan this QR code to pay ${payeeName || upiId}${amount ? ` Rs. ${amount}` : ""}`,
          files: [file],
        })

        toast({
          title: "QR Code Shared",
          description: "Your QR code has been shared successfully",
        })
      } else {
        // Fallback for browsers that don't support Web Share API
        toast({
          title: "Sharing Not Supported",
          description: "Your browser doesn't support direct sharing. Please use the download button instead.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Share error:", error)
      toast({
        title: "Share Failed",
        description: "There was an error sharing the QR code",
        variant: "destructive",
      })
    }
  }

  // Save QR code to history
  const saveQR = () => {
    if (!qrValue || !upiId) {
      toast({
        title: "Generate QR First",
        description: "Please generate a QR code before saving",
        variant: "destructive",
      })
      return
    }

    const newQR: SavedQR = {
      id: `qr-${Date.now()}`,
      upiId,
      amount,
      payeeName,
      note: transactionNote,
      timestamp: Date.now(),
      qrValue,
      isDynamic: activeTab === "dynamic",
    }

    const updatedQRs = [newQR, ...savedQRs].slice(0, 10) // Keep only the last 10 QRs
    setSavedQRs(updatedQRs)

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("savedUpiQRs", JSON.stringify(updatedQRs))
    }

    toast({
      title: "QR Code Saved",
      description: "Your QR code has been saved to history",
    })
  }

  // Load a saved QR
  const loadSavedQR = (savedQR: SavedQR) => {
    setUpiId(savedQR.upiId)
    setAmount(savedQR.amount)
    setPayeeName(savedQR.payeeName)
    setTransactionNote(savedQR.note)
    setActiveTab(savedQR.isDynamic ? "dynamic" : "static")

    // Generate the QR code
    setTimeout(() => {
      generateUpiUrl()
    }, 100)

    toast({
      title: "QR Code Loaded",
      description: `Loaded QR code for ${savedQR.upiId}`,
    })
  }

  // Delete a saved QR
  const deleteSavedQR = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the parent click handler

    const updatedQRs = savedQRs.filter((qr) => qr.id !== id)
    setSavedQRs(updatedQRs)

    // Update localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("savedUpiQRs", JSON.stringify(updatedQRs))
    }

    toast({
      title: "QR Code Deleted",
      description: "The saved QR code has been removed from history",
    })
  }

  // Copy UPI ID to clipboard
  const copyUpiId = () => {
    if (!upiId) {
      toast({
        title: "No UPI ID",
        description: "Please enter a UPI ID first",
        variant: "destructive",
      })
      return
    }

    navigator.clipboard.writeText(upiId)
    toast({
      title: "UPI ID Copied",
      description: "UPI ID copied to clipboard",
    })
  }

  // Reset form
  const resetForm = () => {
    setUpiId("")
    setAmount("")
    setPayeeName("")
    setTransactionNote("")
    setQrValue("")
    setQrCodeSrc("")
    setIsUpiIdTouched(false)
    setIsValidUpiId(true)

    toast({
      title: "Form Reset",
      description: "All fields have been cleared",
    })
  }

  // Toggle theme
  const toggleTheme = () => {
    // Use resolvedTheme which gives the actual current theme (accounting for system preference)
    const currentTheme = resolvedTheme || theme
    setTheme(currentTheme === "dark" ? "light" : "dark")
  }

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted || !isClient) {
    return null
  }

  // Use resolvedTheme to get the actual current theme
  const currentTheme = resolvedTheme || theme

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center">UPI QR Code Generator</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}
                >
                  {currentTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle {currentTheme === "dark" ? "light" : "dark"} mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <History className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View saved QR codes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Saved QR Codes</DialogTitle>
                <DialogDescription>Your recently generated QR codes. Click on any to load it.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                {savedQRs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No saved QR codes yet</p>
                    <p className="text-sm mt-2">Generate and save a QR code to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {savedQRs.map((savedQR) => (
                      <div
                        key={savedQR.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => {
                          loadSavedQR(savedQR)
                          const closeButton = document.querySelector("[data-dialog-close]") as HTMLElement
                          if (closeButton) closeButton.click()
                        }}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{savedQR.upiId}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>{formatDate(savedQR.timestamp)}</span>
                            {savedQR.isDynamic && savedQR.amount && (
                              <Badge variant="outline" className="ml-2">
                                ₹{savedQR.amount}
                              </Badge>
                            )}
                          </div>
                          {savedQR.payeeName && <div className="text-sm">{savedQR.payeeName}</div>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteSavedQR(savedQR.id, e)}
                          className="opacity-50 hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Enter your UPI details to generate a QR code</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="static" className="mb-6" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="static" className="text-xs sm:text-sm px-2 sm:px-4">
                  Static QR
                </TabsTrigger>
                <TabsTrigger value="dynamic" className="text-xs sm:text-sm px-2 sm:px-4">
                  <span className="hidden sm:inline">Dynamic QR with Amount</span>
                  <span className="sm:hidden">Dynamic QR</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="static">
                <p className="text-sm text-muted-foreground mb-4">
                  Static QR codes allow the payer to enter any amount when scanning
                </p>
              </TabsContent>
              <TabsContent value="dynamic">
                <p className="text-sm text-muted-foreground mb-4">
                  Dynamic QR codes have a fixed amount that cannot be changed by the payer
                </p>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="upiId" className="flex items-center gap-1">
                    UPI ID <span className="text-red-500">*</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enter your UPI ID in the format username@provider</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copyUpiId} disabled={!upiId}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="upiId"
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={handleUpiIdChange}
                    className={cn(isUpiIdTouched && !isValidUpiId && "border-red-500 focus-visible:ring-red-500")}
                    required
                  />
                  {isUpiIdTouched && !isValidUpiId && (
                    <div className="text-xs text-red-500 mt-1">Please enter a valid UPI ID (e.g., yourname@okaxis)</div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Example: yourname@okaxis or 9876543210@paytm</p>
              </div>

              {activeTab === "dynamic" && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={handleAmountChange}
                    min="0.01"
                    step="0.01"
                    className={cn(!isValidAmount && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {!isValidAmount && <div className="text-xs text-red-500 mt-1">Amount must be positive</div>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="payeeName">Payee Name</Label>
                <Input
                  id="payeeName"
                  placeholder="Your name or business name"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionNote">Transaction Note</Label>
                <Textarea
                  id="transactionNote"
                  placeholder="Payment for..."
                  value={transactionNote}
                  onChange={(e) => setTransactionNote(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="customization" className="text-sm font-medium cursor-pointer">
                    Customize QR Code
                  </Label>
                  <Switch id="customization" checked={showCustomization} onCheckedChange={setShowCustomization} />
                </div>

                {showCustomization && (
                  <div className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="qrColor">QR Code Color</Label>
                      <div className="flex gap-2">
                        <div
                          className="w-10 h-10 rounded border flex-shrink-0"
                          style={{ backgroundColor: `#${qrColor}` }}
                        />
                        <Select value={qrColor} onValueChange={setQrColor}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="000000">Black</SelectItem>
                            <SelectItem value="0000FF">Blue</SelectItem>
                            <SelectItem value="FF0000">Red</SelectItem>
                            <SelectItem value="006400">Green</SelectItem>
                            <SelectItem value="800080">Purple</SelectItem>
                            <SelectItem value="FFA500">Orange</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bgColor">Background Color</Label>
                      <div className="flex gap-2">
                        <div
                          className="w-10 h-10 rounded border flex-shrink-0"
                          style={{ backgroundColor: `#${bgColor}` }}
                        />
                        <Select value={bgColor} onValueChange={setBgColor}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FFFFFF">White</SelectItem>
                            <SelectItem value="F0F8FF">Light Blue</SelectItem>
                            <SelectItem value="FFF0F5">Light Pink</SelectItem>
                            <SelectItem value="F0FFF0">Light Green</SelectItem>
                            <SelectItem value="FFF8DC">Cream</SelectItem>
                            <SelectItem value="FFFACD">Light Yellow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={resetForm}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={generateUpiUrl}>Generate QR Code</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your QR Code</CardTitle>
            <CardDescription>Scan this QR code with any UPI payment app</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div
              ref={qrRef}
              className={cn(
                "flex items-center justify-center p-4 rounded-lg border w-64 h-64 mx-auto transition-all duration-300",
                !qrCodeSrc && "border-dashed",
                qrCodeSrc && `bg-[#${bgColor}]`,
              )}
            >
              {qrCodeSrc ? (
                <img
                  src={qrCodeSrc || "/placeholder.svg"}
                  alt="UPI QR Code"
                  className="max-w-full max-h-full"
                  onError={(e) => {
                    // If image fails to load, show error message
                    e.currentTarget.style.display = "none"
                    toast({
                      title: "QR Code Error",
                      description: "Failed to load QR code. Please try again.",
                      variant: "destructive",
                    })
                  }}
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <p>QR code will appear here</p>
                  <p className="text-xs mt-2">Fill in the details and click Generate</p>
                </div>
              )}
            </div>

            {qrValue && (
              <div className="mt-4 text-center">
                <p className="text-sm font-medium mb-1">
                  {activeTab === "dynamic" && amount ? `₹${amount}` : "Variable Amount"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {upiId} {payeeName ? `(${payeeName})` : ""}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button onClick={downloadQR} disabled={!qrCodeSrc || isDownloading} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download QR Code"}
            </Button>

            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={shareQR} disabled={!qrCodeSrc}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>

              <Button variant="outline" className="flex-1" onClick={saveQR} disabled={!qrCodeSrc}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Scan the QR code with any UPI app like Google Pay, PhonePe, Paytm, or BHIM</p>
      </div>
    </div>
  )
}

