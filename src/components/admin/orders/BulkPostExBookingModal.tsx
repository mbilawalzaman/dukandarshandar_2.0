"use client";

import React, { useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

export interface OrderForBulkBooking {
  _id: string;
  orderNumber?: string;
  customer_name?: string;
  total_amount?: number;
  postexDetails?: {
    trackingNumber?: string;
    orderStatus?: string;
  };
}

interface BulkPostExBookingModalProps {
  open: boolean;
  onClose: () => void;
  orders: OrderForBulkBooking[];
  onSuccess?: () => void;
}

interface BookingResult {
  orderId: string;
  trackingNumber?: string;
  success: boolean;
  error?: string;
}

export default function BulkPostExBookingModal({
  open,
  onClose,
  orders,
  onSuccess,
}: BulkPostExBookingModalProps) {
  const [booking, setBooking] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<BookingResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadSheetLoading, setLoadSheetLoading] = useState<boolean>(false);
  const [airwayBillLoading, setAirwayBillLoading] = useState<boolean>(false);

  const unbookedOrders = orders.filter((o) => !o.postexDetails?.trackingNumber);

  const bookedOrders = orders.filter((o) =>
    Boolean(o.postexDetails?.trackingNumber),
  );

  const handleStartBulkBooking = async () => {
    if (unbookedOrders.length === 0) return;
    setBooking(true);
    setErrorMsg(null);
    setResults([]);
    setProgress(0);

    const newResults: BookingResult[] = [];

    for (let i = 0; i < unbookedOrders.length; i++) {
      const order = unbookedOrders[i];

      try {
        const res = await fetch("/api/admin/postex/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order._id,
            orderType: "Normal",
            pickupAddressCode: "001",
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: { trackingNumber?: string };
        };

        if (res.ok && data.success && data.data?.trackingNumber) {
          newResults.push({
            orderId: order._id,
            trackingNumber: data.data.trackingNumber,
            success: true,
          });
        } else {
          newResults.push({
            orderId: order._id,
            success: false,
            error: data.error || "Failed to book with PostEx",
          });
        }
      } catch (err: unknown) {
        const errorObj = err as Error;

        newResults.push({
          orderId: order._id,
          success: false,
          error: errorObj.message || "Network request failed",
        });
      }

      setProgress(Math.round(((i + 1) / unbookedOrders.length) * 100));
      setResults([...newResults]);
    }

    setBooking(false);
    if (onSuccess) onSuccess();
  };

  const getAvailableTrackingNumbers = () => {
    const bookedNumbers = bookedOrders
      .map((o) => o.postexDetails?.trackingNumber)
      .filter((tn): tn is string => Boolean(tn));

    const resultNumbers = results
      .map((r) => r.trackingNumber)
      .filter((tn): tn is string => Boolean(tn));

    return Array.from(new Set([...bookedNumbers, ...resultNumbers]));
  };

  const handleGenerateLoadSheet = async () => {
    const trackingNumbers = getAvailableTrackingNumbers();

    if (trackingNumbers.length === 0) {
      setErrorMsg(
        "No active PostEx tracking numbers available to generate a Load Sheet.",
      );

      return;
    }

    setLoadSheetLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/postex/load-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumbers,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        throw new Error(
          errData.error || "Failed to generate PostEx Load Sheet PDF",
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");
    } catch (err: unknown) {
      const errorObj = err as Error;

      setErrorMsg(errorObj.message || "Failed to generate Load Sheet");
    } finally {
      setLoadSheetLoading(false);
    }
  };

  const handlePrintAirwayBills = async () => {
    const trackingNumbers = getAvailableTrackingNumbers();

    if (trackingNumbers.length === 0) {
      setErrorMsg(
        "No active PostEx tracking numbers available to print Airway Bills.",
      );

      return;
    }

    setAirwayBillLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/postex/airway-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumbers,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        throw new Error(
          errData.error || "Failed to print PostEx Airway Bills PDF",
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");
    } catch (err: unknown) {
      const errorObj = err as Error;

      setErrorMsg(errorObj.message || "Failed to print Airway Bills");
    } finally {
      setAirwayBillLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalShippingIcon color="primary" />
        Bulk PostEx Courier Actions ({orders.length} Selected)
      </DialogTitle>
      <DialogContent dividers>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Chip
            label={`Total Selected: ${orders.length}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Needs Booking: ${unbookedOrders.length}`}
            color="warning"
          />
          <Chip
            label={`Already Booked: ${bookedOrders.length}`}
            color="success"
            variant="outlined"
          />
        </Box>

        {booking && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Booking orders with PostEx... ({progress}%)
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {results.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              Bulk Booking Results:
            </Typography>
            <List dense sx={{ bgcolor: "grey.50", borderRadius: 1 }}>
              {results.map((res, idx) => (
                <React.Fragment key={res.orderId}>
                  {idx > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      {res.success ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={`Order #${res.orderId.slice(-8).toUpperCase()}`}
                      secondary={
                        res.success
                          ? `Tracking #: ${res.trackingNumber}`
                          : `Error: ${res.error}`
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary">
          Click <strong>Book Unbooked Orders</strong> to automatically assign
          PostEx tracking numbers to all unbooked orders.
          <br />
          Click <strong>Generate Load Sheet PDF</strong> to download the
          official combined dispatch load sheet for PostEx pickup.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleGenerateLoadSheet}
            disabled={
              loadSheetLoading ||
              (bookedOrders.length === 0 &&
                results.filter((r) => r.success).length === 0)
            }
          >
            {loadSheetLoading ? "Generating..." : "Generate Load Sheet PDF"}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handlePrintAirwayBills}
            disabled={
              airwayBillLoading ||
              (bookedOrders.length === 0 &&
                results.filter((r) => r.success).length === 0)
            }
          >
            {airwayBillLoading ? "Printing..." : "Print Airway Bills PDF"}
          </Button>
          {unbookedOrders.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LocalShippingIcon />}
              onClick={handleStartBulkBooking}
              disabled={booking}
            >
              {booking ? "Booking..." : `Book ${unbookedOrders.length} Orders`}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
