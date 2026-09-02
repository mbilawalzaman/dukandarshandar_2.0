"use client";

import React, { Suspense, useCallback, useRef, useState } from "react";
import { Box, Button, CircularProgress, Dialog, DialogContent, Typography } from "@mui/material";
import { CardCapture, Environment, PayerAuthentication } from "@sfpy/atoms";
import "@sfpy/atoms/styles";
import { BRAND } from "@/lib/constants";

interface PayerAuthSession {
  accessToken: string;
  deviceDataCollectionURL: string;
}

interface CardCaptureRef {
  submit: () => void;
  validate: () => void;
  fetchValidity: () => Promise<boolean>;
  clear: () => void;
}

interface SafepayPaymentFormProps {
  tracker: string;
  clientToken: string;
  environment: "sandbox" | "production";
  onSuccess: () => void;
  onError: (message: string) => void;
}

/** Safepay CardCapture renders an iframe that fills its parent fixed height is required. */
const CARD_CAPTURE_HEIGHT = "2.75rem";

const CARD_INPUT_STYLE = {
  fontFamily: "Poppins, system-ui, sans-serif",
  fontSize: "16px",
  color: "#0f172a",
};

const cardCaptureSx = {
  width: "100%",
  mb: 2,
  "& .safepay-atoms-root": {
    height: "auto",
    width: "100%",
  },
  "& .safepay-atoms-root .iframeWrapper": {
    height: CARD_CAPTURE_HEIGHT,
    display: "flex",
    alignItems: "center",
    borderRadius: 1,
    bgcolor: "#fff",
    borderColor: "#cbd5e1",
    "--input-vertical-padding": "0.5rem",
    "--input-horizontal-padding": "0.875rem",
    transition: "border-color 0.2s ease",
    "&:hover": {
      borderColor: BRAND.gold,
    },
  },
  "& .safepay-atoms-root .iframeWrapper.focus": {
    borderColor: BRAND.gold,
  },
  "& .safepay-atoms-iframe": {
    height: "100%",
  },
  "& .safepay-atoms-root .errorMessage": {
    mt: 0.75,
    fontSize: "0.8125rem",
    color: "#dc2626",
  },
} as const;

function SafepayPaymentFormInner({
  tracker,
  clientToken,
  environment,
  onSuccess,
  onError,
}: SafepayPaymentFormProps) {
  const cardRef = useRef<CardCaptureRef | null>(null);
  const payerAuthRef = useRef(null);
  const payingRef = useRef(false);
  const [payerAuthSession, setPayerAuthSession] = useState<PayerAuthSession | null>(null);
  const [discountBody, setDiscountBody] = useState<
    | {
        dry_run: boolean;
        bin_discount: { cardscheme_id: string; bin: string };
      }
    | undefined
  >();
  const [paying, setPaying] = useState(false);

  const safepayEnvironment = environment === "production" ? Environment.Production : Environment.Sandbox;

  const resetPaying = useCallback(() => {
    payingRef.current = false;
    setPaying(false);
  }, []);

  const closeModal = useCallback(() => {
    setPayerAuthSession(null);
  }, []);

  const handlePaymentError = useCallback(
    (message: string) => {
      resetPaying();
      onError(message);
    },
    [onError, resetPaying]
  );

  const handlePay = useCallback(async () => {
    if (payingRef.current) return;

    try {
      payingRef.current = true;
      setPaying(true);

      const isValid = await cardRef.current?.fetchValidity();
      if (!isValid) {
        handlePaymentError("Please enter valid card details");
        return;
      }

      cardRef.current?.submit();
    } catch {
      handlePaymentError("Could not submit payment");
    }
  }, [handlePaymentError]);

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: BRAND.navy, mb: 2 }}>
        Card payment
      </Typography>

      <Box sx={cardCaptureSx}>
        <CardCapture
          environment={safepayEnvironment}
          authToken={clientToken}
          tracker={tracker}
          validationEvent="submit"
          inputStyle={CARD_INPUT_STYLE}
          imperativeRef={cardRef}
          onError={(error) =>
            handlePaymentError(typeof error === "string" ? error : "Payment error occurred")
          }
          onDiscountApplied={(data) => {
            if (data?.discountBody && "dry_run" in data.discountBody && "bin_discount" in data.discountBody) {
              setDiscountBody(data.discountBody as { dry_run: boolean; bin_discount: { cardscheme_id: string; bin: string } });
            }
          }}
          onProceedToAuthentication={(data) => {
            setPayerAuthSession({
              accessToken: data.accessToken,
              deviceDataCollectionURL: data.deviceDataCollectionURL,
            });
          }}
        />
      </Box>

      <Button
        variant="contained"
        fullWidth
        size="large"
        disabled={paying}
        onClick={handlePay}
        sx={{
          fontWeight: 700,
          backgroundColor: BRAND.gold,
          color: BRAND.navy,
          "&:hover": { backgroundColor: BRAND.goldHover },
          "&.Mui-disabled": {
            backgroundColor: BRAND.gold,
            color: BRAND.navy,
            opacity: 0.72,
          },
        }}
      >
        {paying ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <CircularProgress size={18} sx={{ color: BRAND.navy }} />
            Processing payment...
          </Box>
        ) : (
          "Pay securely"
        )}
      </Button>

      <Dialog
        open={Boolean(payerAuthSession)}
        onClose={() => {
          closeModal();
          resetPaying();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 0, minHeight: 420 }}>
          {payerAuthSession && (
            <PayerAuthentication
              environment={safepayEnvironment}
              authToken={clientToken}
              tracker={tracker}
              imperativeRef={payerAuthRef}
              deviceDataCollectionJWT={payerAuthSession.accessToken}
              deviceDataCollectionURL={payerAuthSession.deviceDataCollectionURL}
              discountBody={discountBody}
              authorizationOptions={{
                do_capture: true,
                do_card_on_file: false,
              }}
              onPayerAuthenticationSuccess={() => {
                closeModal();
                onSuccess();
              }}
              onPayerAuthenticationFrictionless={() => {
                closeModal();
                onSuccess();
              }}
              onPayerAuthenticationFailure={() => {
                closeModal();
                handlePaymentError("Payment authentication failed");
              }}
              onPayerAuthenticationUnavailable={() => {
                closeModal();
                handlePaymentError("Payment authentication unavailable");
              }}
              onSafepayError={() => {
                closeModal();
                handlePaymentError("Safepay payment error");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default function SafepayPaymentForm(props: SafepayPaymentFormProps) {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={32} sx={{ color: BRAND.gold }} />
        </Box>
      }
    >
      <SafepayPaymentFormInner {...props} />
    </Suspense>
  );
}
