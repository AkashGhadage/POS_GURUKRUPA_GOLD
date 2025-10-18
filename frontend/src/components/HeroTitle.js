import React from 'react';
import { Box, Typography } from '@mui/material';

export default function HeroTitle() {
  return (
    <Box
      sx={{
        width: "100%",
        pt: { xs: 4, md: 0 },
        pb: { xs: 2, md: 2 },
        textAlign: "center",
        background: "linear-gradient(120deg,#fffbe7 70%,#faecd6 100%)",
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontFamily: "'Playfair Display','Cinzel','EB Garamond',serif",
          fontWeight: 900,
          letterSpacing: 7,
          background: "linear-gradient(90deg, #FFD700 12%, #B78629 94%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          textTransform: "uppercase",
          mb: 1,
          fontSize: { xs: 38, sm: 54, md: 55 }
        }}
      >
        GURUKRUPA GOLD
      </Typography>
      <Box
        sx={{
          width: { xs: 120, md: 550 },
          height: 6,
          bgcolor: "#ffeab5",
          borderRadius: 10,
          mx: "auto",
          mb: 0,
          boxShadow: "0 2px 16px #FFD70033"
        }}
      />
    </Box>
  );
}
