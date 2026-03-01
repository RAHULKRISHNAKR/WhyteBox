/**
 * CertificateDisplay Component
 * Displays and allows downloading of learning path certificates
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { Certificate } from '../../types/learningPath';

interface CertificateDisplayProps {
  certificate: Certificate;
  onDownload?: () => void;
  onShare?: () => void;
}

export const CertificateDisplay: React.FC<CertificateDisplayProps> = ({
  certificate,
  onDownload,
  onShare,
}) => {
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Paper
      elevation={4}
      sx={{
        p: 4,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <VerifiedIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Certificate of Completion
          </Typography>
          <Typography variant="subtitle1">
            WhyteBox AI Explainability Platform
          </Typography>
        </Box>

        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)', mb: 4 }} />

        {/* Recipient */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="body1" gutterBottom>
            This is to certify that
          </Typography>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {certificate.userName}
          </Typography>
          <Typography variant="body1" gutterBottom>
            has successfully completed the learning path
          </Typography>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {certificate.pathTitle}
          </Typography>
        </Box>

        {/* Skills */}
        {certificate.skills.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom textAlign="center">
              Skills Acquired:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {certificate.skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)', mb: 4 }} />

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="caption" display="block">
              Completion Date
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatDate(certificate.completedAt)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" display="block">
              Verification Code
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {certificate.verificationCode}
            </Typography>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              },
            }}
          >
            Download PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={onShare}
            sx={{
              borderColor: 'white',
              color: 'white',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Share
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

// Made with Bob
