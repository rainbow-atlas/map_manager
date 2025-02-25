import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Chip,
} from '@mui/material';
import {
    EditOutlined,
    DeleteOutlineOutlined,
    AddOutlined,
    LocalOfferOutlined,
} from '@mui/icons-material';
import { LocationService } from '../services/LocationService';

export default function TagsPage() {
    const [tags, setTags] = useState<string[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editingTag, setEditingTag] = useState({ old: '', new: '' });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTags();
    }, []);

    const loadTags = () => {
        // Extract unique tags from all locations
        const allLocations = LocationService.getAllLocations();
        const uniqueTags = new Set<string>();
        
        allLocations.forEach(location => {
            if (location.Tags) {
                location.Tags.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0)
                    .forEach(tag => uniqueTags.add(tag));
            }
        });

        setTags(Array.from(uniqueTags).sort());
    };

    const handleAdd = async () => {
        if (!newTag.trim()) {
            setError('Tag name cannot be empty');
            return;
        }
        if (tags.includes(newTag)) {
            setError('Tag already exists');
            return;
        }

        // For now, we'll just show a message that this needs to be used in locations
        alert('Tags can be added when editing locations. This list shows currently used tags.');
        setIsAddDialogOpen(false);
    };

    const handleEdit = async () => {
        if (!editingTag.new.trim()) {
            setError('Tag name cannot be empty');
            return;
        }
        if (tags.includes(editingTag.new) && editingTag.new !== editingTag.old) {
            setError('Tag already exists');
            return;
        }

        // For now, we'll just show a warning that this needs to be implemented
        alert('Editing tags requires updating all locations using this tag. This feature will be implemented soon.');
        setIsEditDialogOpen(false);
    };

    const handleDelete = async (tag: string) => {
        // For now, we'll just show a warning that this is not implemented
        alert('Deleting tags requires updating all locations using this tag. This feature will be implemented soon.');
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1">
                    Tags
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddOutlined />}
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    Add Tag
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ mt: 2, p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            onDelete={() => handleDelete(tag)}
                            onClick={() => {
                                setEditingTag({ old: tag, new: tag });
                                setIsEditDialogOpen(true);
                            }}
                        />
                    ))}
                </Box>
            </Paper>

            {/* Add Tag Dialog */}
            <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
                <DialogTitle>Add New Tag</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tag Name"
                        fullWidth
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd} variant="contained">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Tag Dialog */}
            <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
                <DialogTitle>Edit Tag</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tag Name"
                        fullWidth
                        value={editingTag.new}
                        onChange={(e) => setEditingTag({ ...editingTag, new: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEdit} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <LocalOfferOutlined sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
        </Box>
    );
} 