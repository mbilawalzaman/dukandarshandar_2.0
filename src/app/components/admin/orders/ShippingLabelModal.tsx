"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { authFetch } from "@/lib/authFetch";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderForLabel {
  _id: string;
  customer_name: string;
  customer_email?: string;
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  safepay_tracker?: string | null;
  paid_at?: string;
  created_at?: string;
}

interface ShippingLabelModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderForLabel | null;
}

/** Simple SVG Barcode generator for visual DS labels */
function SimpleSvgBarcode({ value }: { value: string }) {
  const bars: { x: number; width: number }[] = [];
  let currentX = 10;
  const hashStr = value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let i = 0; i < 45; i++) {
    const width = ((hashStr + i * 7) % 3) + 1.5;
    bars.push({ x: currentX, width });
    currentX += width + (((hashStr + i * 13) % 3) + 1.5);
  }

  return (
    <svg width="100%" height="55" viewBox={`0 0 ${currentX + 10} 55`} style={{ display: "block" }}>
      <rect width="100%" height="55" fill="#ffffff" />
      {bars.map((bar, idx) => (
        <rect key={idx} x={bar.x} y="5" width={bar.width} height="45" fill="#000000" />
      ))}
    </svg>
  );
}

export default function ShippingLabelModal({ open, onClose, order }: ShippingLabelModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useDeliverySettings();
  const [storeProfile, setStoreProfile] = useState<{
    name?: string;
    storeName?: string;
    phone?: string;
    province?: string;
    city?: string;
    area?: string;
    address?: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    authFetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setStoreProfile(data.profile);
        }
      })
      .catch(() => undefined);
  }, [open]);

  if (!order) return null;

  const brandName = storeProfile?.storeName || storeProfile?.name || "DukandarShandar";
  const senderName = storeProfile?.storeName || storeProfile?.name || "DukandarShandar Store";
  const senderAddressParts = [
    storeProfile?.address,
    storeProfile?.area,
    storeProfile?.city,
    storeProfile?.province,
  ].filter(Boolean);
  const senderAddress = senderAddressParts.length > 0
    ? senderAddressParts.join(", ")
    : "Main Boulevard, Gulberg III, Lahore, Punjab, Pakistan";
  const senderPhone = storeProfile?.phone || "+92 300 8495148";

  const isCOD = order.payment_method === "cod" || !order.payment_method;
  const orderIdShort = order._id.slice(-8).toUpperCase();
  const totalWeight = Math.max(0.2, (order.items?.length || 1) * 0.4).toFixed(1);
  const cityTag = order.city
    ? `${order.city.slice(0, 3).toUpperCase()}-${order.province ? order.province.slice(0, 3).toUpperCase() : "PK"}`
    : "ISB-PK";

  const creationDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();
  const printDate = new Date().toLocaleDateString();

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping Label - Order #${orderIdShort}</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 10px;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
            }
            .label-container {
              width: 100%;
              max-width: 380px;
              margin: 0 auto;
              border: 2px solid #000;
              box-sizing: border-box;
              font-size: 11px;
              line-height: 1.2;
            }
            .header-barcodes {
              display: flex;
              border-bottom: 2px solid #000;
            }
            .header-col {
              flex: 1;
              padding: 4px;
              text-align: center;
              border-right: 1px solid #000;
            }
            .header-col:last-child {
              border-right: none;
            }
            .col-title {
              font-weight: bold;
              font-size: 9px;
              text-transform: uppercase;
            }
            .tracking-bar {
              height: 20px;
              border-bottom: 2px solid #000;
              background: #ffffff;
            }
            .meta-grid {
              display: flex;
              border-bottom: 2px solid #000;
            }
            .meta-left {
              flex: 1.2;
              padding: 8px;
              border-right: 2px solid #000;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 900;
              letter-spacing: -0.5px;
            }
            .hub-code {
              font-size: 14px;
              font-weight: 800;
              margin-top: 6px;
              padding: 2px 6px;
              border: 1px solid #000;
            }
            .meta-right {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .meta-row {
              padding: 3px 6px;
              border-bottom: 1px solid #000;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .meta-row:last-child {
              border-bottom: none;
            }
            .amount-box {
              background: #000;
              color: #fff;
            }
            .non-cod-box {
              background: #f1f5f9;
              color: #000;
            }
            .order-bar {
              padding: 4px 6px;
              font-weight: bold;
              text-align: center;
              border-bottom: 1px solid #000;
              font-size: 11px;
            }
            .dates-bar {
              display: flex;
              border-bottom: 2px solid #000;
              font-size: 9px;
            }
            .dates-col {
              flex: 1;
              padding: 3px 6px;
              border-right: 1px solid #000;
            }
            .dates-col:last-child {
              border-right: none;
            }
            .address-section {
              display: flex;
            }
            .qr-col {
              width: 100px;
              padding: 6px;
              border-right: 1px solid #000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .info-col {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .party-box {
              padding: 6px;
              border-bottom: 1px solid #000;
            }
            .party-box:last-child {
              border-bottom: none;
            }
            .party-title {
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              text-decoration: underline;
              margin-bottom: 2px;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const recipientAddress = [order.address, order.area, order.city, order.province]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LocalShippingIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Print Shipping Label (AWB)
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ backgroundColor: "#f8fafc", py: 3, display: "flex", justifyContent: "center" }}>
        {/* Printable Shipping Label Container */}
        <Box
          ref={printRef}
          className="label-container"
          sx={{
            width: "360px",
            backgroundColor: "#ffffff",
            border: "2px solid #0f172a",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            color: "#0f172a",
          }}
        >
          {/* Top Barcodes */}
          <Box sx={{ display: "flex", borderBottom: "2px solid #000" }}>
            <Box sx={{ flex: 1, p: 0.5, textAlign: "center", borderRight: "1px solid #000" }}>
              <Typography variant="caption" sx={{ fontWeight: "bold", fontSize: "9px", display: "block" }}>
                Sales_order
              </Typography>
              <SimpleSvgBarcode value={order._id} />
            </Box>
            <Box sx={{ flex: 1, p: 0.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: "bold", fontSize: "9px", display: "block" }}>
                marketplace
              </Typography>
              <SimpleSvgBarcode value={`MP-${orderIdShort}`} />
            </Box>
          </Box>

          {/* Empty Barcode / Tracking Header Box */}
          <Box sx={{ py: 1, borderBottom: "2px solid #000", minHeight: "20px", backgroundColor: "#ffffff" }} />

          {/* Meta Grid */}
          <Box sx={{ display: "flex", borderBottom: "2px solid #000" }}>
            {/* Left Store Brand & Hub Code */}
            <Box
              sx={{
                flex: 1.2,
                p: 1.5,
                borderRight: "2px solid #000",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "18px", letterSpacing: -0.5, color: "#000" }}>
                {brandName}
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  px: 1,
                  py: 0.25,
                  border: "1px solid #000",
                  fontWeight: 800,
                  fontSize: "13px",
                  borderRadius: "2px",
                }}
              >
                {cityTag}
              </Box>
            </Box>

            {/* Right Meta Rows */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <Box sx={{ p: 0.5, borderBottom: "1px solid #000", textAlign: "center", fontWeight: 700 }}>
                STANDARD
              </Box>
              <Box sx={{ p: 0.5, borderBottom: "1px solid #000", textAlign: "center", fontWeight: 700 }}>
                {totalWeight} KG
              </Box>
              <Box sx={{ p: 0.5, borderBottom: "1px solid #000", textAlign: "center", fontWeight: 700 }}>
                HOME
              </Box>

              {/* COD vs NON-COD Payment Box */}
              <Box
                sx={{
                  p: 0.5,
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: "13px",
                  backgroundColor: isCOD ? "#000000" : "#f1f5f9",
                  color: isCOD ? "#ffffff" : "#000000",
                  borderBottom: "1px solid #000",
                }}
              >
                {isCOD ? "COD" : "NON COD"}
              </Box>

              {/* Amount Box */}
              <Box
                sx={{
                  p: 0.5,
                  display: "flex",
                  justifyContent: "space-between",
                  px: 1,
                  fontWeight: 800,
                  backgroundColor: isCOD ? "#000000" : "#ffffff",
                  color: isCOD ? "#ffffff" : "#000000",
                }}
              >
                <span>PKR</span>
                <span>{isCOD ? `${Number(order.total_amount).toLocaleString()}.00` : "0.00"}</span>
              </Box>
            </Box>
          </Box>

          {/* Order Number */}
          <Box sx={{ p: 0.75, textAlign: "center", fontWeight: 700, borderBottom: "1px solid #000", fontSize: "11px" }}>
            Order Number: {orderIdShort}
          </Box>

          {/* Dates Bar */}
          <Box sx={{ display: "flex", borderBottom: "2px solid #000", fontSize: "9px" }}>
            <Box sx={{ flex: 1, p: 0.5, borderRight: "1px solid #000" }}>
              Order Creation Date: <b>{creationDate}</b>
            </Box>
            <Box sx={{ flex: 1, p: 0.5 }}>
              AWB Print Date: <b>{printDate}</b>
            </Box>
          </Box>

          {/* Address Section */}
          <Box sx={{ display: "flex" }}>
            {/* Store QR Code */}
            <Box
              sx={{
                width: 90,
                p: 0.75,
                borderRight: "1px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src={settings.qrCodeImage || "/images/store-qr-code.png"}
                alt="QR Code"
                width={75}
                height={75}
                style={{ width: "75px", height: "75px", display: "block", objectFit: "contain" }}
              />
            </Box>

            {/* Recipient & Sender */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Recipient */}
              <Box sx={{ p: 0.75, borderBottom: "1px solid #000" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", fontSize: "9px", textDecoration: "underline", display: "block" }}>
                  Recipient
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, display: "block", fontSize: "10px" }}>
                  {order.customer_name}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", fontSize: "9.5px", color: "#334155", leading: 1.1 }}>
                  {recipientAddress || "No detailed address provided"}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block", fontSize: "9.5px", mt: 0.25 }}>
                  Phone: {order.phone || "N/A"}
                </Typography>
              </Box>

              {/* Sender */}
              <Box sx={{ p: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", fontSize: "9px", textDecoration: "underline", display: "block" }}>
                  Sender
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, display: "block", fontSize: "10px" }}>
                  {senderName}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", fontSize: "9px", color: "#334155" }}>
                  {senderAddress}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block", fontSize: "9px" }}>
                  Phone: {senderPhone}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Close
        </Button>
        <Button onClick={handlePrint} variant="contained" color="primary" startIcon={<PrintIcon />}>
          Print Shipping Label
        </Button>
      </DialogActions>
    </Dialog>
  );
}
