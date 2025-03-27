"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Download, Copy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Dynamically import QRCode component to avoid server-side rendering issues
const QRCode = dynamic(() => import("qrcode.react"), {
  ssr: false,
  loading: () => (
    <div className="w-56 h-56 flex items-center justify-center bg-muted/20 animate-pulse">Loading QR Code...</div>
  ),
})

export function UpiQrGenerator() {
  const [upiId, setUpiId] = useState("")
  const [amount, setAmount] = useState("")
  const [payeeName, setPayeeName] = useState("")
  const [transactionNote, setTransactionNote] = useState("")
  const [qrValue, setQrValue] = useState("")
  const [activeTab, setActiveTab] = useState("static")

  // Generate UPI URL
  const generateUpiUrl = () => {
    if (!upiId) {
      toast({
        title: "UPI ID Required",
        description: "Please enter a valid UPI ID",
        variant: "destructive",
      })
      return
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
    url += `&tr=${Date.now()}`

    // Add mode and purpose
    url += "&cu=INR&mode=01&purpose=00"

    setQrValue(url)
  }

  // Download QR code as image
  const downloadQR = () => {
    if (!qrValue) {
      toast({
        title: "Generate QR First",
        description: "Please generate a QR code before downloading",
        variant: "destructive",
      })
      return
    }

    try {
      const canvas = document.querySelector("#qr-code canvas") as HTMLCanvasElement
      if (canvas) {
        const url = canvas.toDataURL("image/png")
        const link = document.createElement("a")
        link.download = `upi-qr-${upiId}-${Date.now()}.png`
        link.href = url
        link.click()

        toast({
          title: "QR Code Downloaded",
          description: "Your QR code has been downloaded successfully",
        })
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading the QR code",
        variant: "destructive",
      })
    }
  }

  // Copy UPI URL to clipboard
  const copyUpiUrl = () => {
    if (!qrValue) {
      toast({
        title: "Generate QR First",
        description: "Please generate a QR code before copying the link",
        variant: "destructive",
      })
      return
    }

    try {
      navigator.clipboard.writeText(qrValue)
      toast({
        title: "URL Copied",
        description: "UPI payment URL copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "There was an error copying to clipboard",
        variant: "destructive",
      })
    }
  }

  // Reset form
  const resetForm = () => {
    setUpiId("")
    setAmount("")
    setPayeeName("")
    setTransactionNote("")
    setQrValue("")

    toast({
      title: "Form Reset",
      description: "All fields have been cleared",
    })
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Enter your UPI details to generate a QR code</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="static" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="static">Static QR</TabsTrigger>
              <TabsTrigger value="dynamic">Dynamic QR with Amount</TabsTrigger>
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
              <Label htmlFor="upiId">
                UPI ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="upiId"
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
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
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                />
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
            id="qr-code"
            className={cn(
              "flex items-center justify-center bg-white p-4 rounded-lg border w-64 h-64 mx-auto",
              !qrValue && "border-dashed",
            )}
          >
            {qrValue ? (
              <QRCode value={qrValue} size={224} level="H" includeMargin={true} />
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
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" onClick={copyUpiUrl} disabled={!qrValue}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          <Button onClick={downloadQR} disabled={!qrValue}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

